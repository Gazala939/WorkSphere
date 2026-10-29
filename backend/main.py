import os
import uuid
from pathlib import Path
from io import StringIO, BytesIO
import csv

from fastapi import UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse, Response
from typing import List

from schemas import PasswordChangeRequest
from security import verify_password, hash_password
from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import FastAPI, Depends, HTTPException, status,Query
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from sqlalchemy.exc import IntegrityError

from apscheduler.schedulers.background import BackgroundScheduler
from email_service import send_email
from database import Base,SessionLocal, engine, get_db
from models import (
    User,
    Employee,
    Task,
    Attendance,
    Announcement,
    Leave,
    Payroll,
    Notification,
    LeavePolicy,
    LeaveBalance,
    Shift,
    EmployeeShift,
    Employee,
    Document,
    Document,
    PerformanceReview,
    Onboarding,
    Resignation,
    Feedback,
    NotificationPreference
   
)
from schemas import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    TokenResponse,
    RoleUpdateRequest,
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeWithUserCreate,
    AttendanceResponse,
    LeaveCreate,
    LeaveDecision,
    LeaveResponse,
    PayrollCreate,
    PayrollResponse,
    LeavePolicyCreate,
    LeavePolicyResponse,
    LeaveBalanceCreate,
    LeaveBalanceResponse,
    AdminUserCreate,
    AdminUserUpdate,
    UserStatusUpdate,
    ShiftCreate,
    ShiftResponse,
    EmployeeShiftCreate,
    EmployeeShiftResponse,
    EmailTestRequest,
    LeaveCalendarItem,
    TeamAvailabilityItem,
    DocumentResponse,
    PerformanceReviewCreate,
    PerformanceReviewResponse,
    OnboardingCreate,
    OnboardingStatusUpdate,
    OnboardingResponse,
    ResignationCreate,
    ResignationDecision,
    ResignationResponse,
    AnnouncementCreate,
    AnnouncementResponse,
    TaskCreate, TaskStatusUpdate, TaskResponse,
    FeedbackCreate, FeedbackResponse,
    ProfileUpdate,
    ProfileResponse,
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse,
)

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from security import (
    hash_password,
    verify_password,
    create_access_token
)
from dependencies import get_current_user, require_role

INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")

# MODULE 16: DOCUMENT MANAGEMENT
DOCUMENTS_DIR = Path(__file__).resolve().parent / "uploaded_documents"
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        is_read=False,
    )

    db.add(notification)

    return notification


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    scheduler = BackgroundScheduler(
        timezone=INDIA_TIMEZONE
    )

    scheduler.add_job(
        run_scheduled_absence_check,
        trigger="interval",
        minutes=5,
        id="daily_absence_check",
        replace_existing=True,
        max_instances=1,
    )

    scheduler.start()

    try:
        yield
    finally:
        scheduler.shutdown(wait=False)




app = FastAPI(
    title="WorkSphere HRMS API",
    description="Authentication and role-based access for WorkSphere",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)




@app.get("/")
def home():
    return {"message": "Welcome to WorkSphere HRMS API"}


@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    username = data.username.strip()
    email = str(data.email).strip().lower()

    if not username:
        raise HTTPException(400, "Username cannot be empty")

    existing_user = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Username or email already registered"
        )

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(data.password),
        role="EMPLOYEE"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user



@app.post("/auth/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    email = str(data.email).strip().lower()

    user = db.query(User).filter(User.email == email).first()

    # Step 1: Check credentials
    if not user or not verify_password(
        data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Step 2: Check whether the account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact the administrator."
        )

    # Step 3: Generate JWT only for active users
    token = create_access_token(user.id, user.role)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@app.get("/auth/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


@app.get("/employee/dashboard")
def employee_dashboard(
    current_user: User = Depends(require_role("EMPLOYEE"))
):
    return {
        "message": f"Welcome, {current_user.username}",
        "dashboard": "Employee Dashboard",
        "role": current_user.role
    }


@app.get("/hr/dashboard")
def hr_dashboard(
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    return {
        "message": f"Welcome, {current_user.username}",
        "dashboard": "HR Dashboard",
        "role": current_user.role
    }


@app.get("/admin/dashboard")
def admin_dashboard(
    current_user: User = Depends(require_role("ADMIN"))
):
    return {
        "message": f"Welcome, {current_user.username}",
        "dashboard": "Admin Dashboard",
        "role": current_user.role
    }


@app.get(
    "/admin/users",
    response_model=list[UserResponse]
)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    return db.query(User).order_by(User.id).all()


@app.patch("/admin/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    data: RoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = data.role
    db.commit()
    db.refresh(user)

    return user



# ==========================================================
# ADMIN USER MANAGEMENT
# ==========================================================

@app.post(
    "/admin/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def admin_create_user(
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    username = data.username.strip()
    email = str(data.email).strip().lower()

    if not username:
        raise HTTPException(status_code=422, detail="Username cannot be empty")

    existing = db.query(User).filter(
        or_(User.username == username, User.email == email)
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists"
        )

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(data.password),
        role=data.role,
        is_active=True
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists"
        )

    return user


@app.patch(
    "/admin/users/{user_id}",
    response_model=UserResponse
)
def admin_update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    updates = data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one field to update"
        )

    if "username" in updates:
        if updates["username"] is None:
            raise HTTPException(status_code=422, detail="Username cannot be null")

        updates["username"] = updates["username"].strip()

        if not updates["username"]:
            raise HTTPException(status_code=422, detail="Username cannot be empty")

    if "email" in updates and updates["email"] is not None:
        updates["email"] = str(updates["email"]).strip().lower()

    for field in ("username", "email"):
        if field in updates and updates[field] is not None:
            duplicate = db.query(User).filter(
                getattr(User, field) == updates[field],
                User.id != user_id
            ).first()

            if duplicate:
                raise HTTPException(
                    status_code=409,
                    detail=f"{field.capitalize()} already exists"
                )

    # Prevent an administrator from deactivating their own account
    # through this endpoint.
    if (
        user.id == current_user.id
        and updates.get("is_active") is False
    ):
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account"
        )

    for field, value in updates.items():
        setattr(user, field, value)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists"
        )

    return user


@app.patch(
    "/admin/users/{user_id}/status",
    response_model=UserResponse
)
def admin_update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and not data.is_active:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account"
        )

    user.is_active = data.is_active
    db.commit()
    db.refresh(user)

    return user


@app.delete(
    "/admin/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    # Employee profiles and their related HR records must be preserved.
    employee = db.query(Employee).filter(
        Employee.user_id == user_id
    ).first()

    if employee:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete this user because an employee profile is linked. Deactivate the account instead."
        )

    # Remove notifications before deleting the user.
    db.query(Notification).filter(
        Notification.user_id == user_id
    ).delete(synchronize_session=False)

    db.delete(user)
    db.commit()

    return None



# ==========================================================
# MODULE 2: EMPLOYEE MANAGEMENT
# ==========================================================

@app.get(
    "/employees",
    response_model=list[EmployeeResponse]
)
def list_employees(
    search: str | None = Query(
        default=None, min_length=1, max_length=100
    ),
    department: str | None = Query(
        default=None, min_length=1, max_length=100
    ),
    employee_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(ACTIVE|INACTIVE)$"
    ),
    role: str | None = Query(
        default=None,
        pattern="^(EMPLOYEE|HR|ADMIN)$"
    ),
    attendance: str | None = Query(
        default=None,
        pattern="^(PRESENT|ABSENT|HALF_DAY|NOT_RECORDED)$"
    ),
    performance: str | None = Query(
        default=None,
        pattern="^(HIGH|AVERAGE|LOW|NOT_REVIEWED)$"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    # Start with employee records and their linked user accounts.
    query = (
        db.query(Employee)
        .join(User, Employee.user_id == User.id)
    )

    # Search by employee name or designation.
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(search_term),
                Employee.designation.ilike(search_term)
            )
        )

    # Filter by department.
    if department:
        query = query.filter(
            Employee.department.ilike(department.strip())
        )

    # Filter by employee status.
    if employee_status:
        query = query.filter(
            Employee.status == employee_status
        )

    # Filter by linked account role.
    if role:
        query = query.filter(User.role == role)

    employees = query.order_by(Employee.id.desc()).all()

    results = []

    for employee in employees:
        # Find this employee's most recent attendance record.
        latest_attendance = (
            db.query(Attendance)
            .filter(Attendance.employee_id == employee.id)
            .order_by(
                Attendance.date.desc(),
                Attendance.id.desc()
            )
            .first()
        )

        # Find this employee's most recent performance review.
        latest_review = (
            db.query(PerformanceReview)
            .filter(
                PerformanceReview.employee_id == employee.id
            )
            .order_by(
                PerformanceReview.created_at.desc()
            )
            .first()
        )

        # Apply attendance filter using the latest record.
        if attendance:
            if attendance == "NOT_RECORDED":
                if latest_attendance is not None:
                    continue
            elif (
                latest_attendance is None
                or latest_attendance.status != attendance
            ):
                continue

        # Apply performance filter using the latest rating.
        if performance:
            if performance == "NOT_REVIEWED":
                if latest_review is not None:
                    continue
            else:
                if latest_review is None:
                    continue

                rating = latest_review.rating

                if performance == "HIGH" and rating < 4:
                    continue

                if performance == "AVERAGE" and not (
                    3 <= rating < 4
                ):
                    continue

                if performance == "LOW" and rating >= 3:
                    continue

        results.append(employee)

    return results

@app.post(
    "/employees/with-account",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_employee_with_account(
    data: EmployeeWithUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    # Clean the input values
    username = data.username.strip()
    email = str(data.email).strip().lower()

    full_name = data.full_name.strip()
    designation = data.designation.strip()
    department = data.department.strip()

    if not username or not full_name or not designation or not department:
        raise HTTPException(
            status_code=422,
            detail="Username and employee text fields cannot be empty"
        )

    # Check whether username or email already exists
    existing_user = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Username or email already registered"
        )

    try:
        # Create the login account
        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(data.password),
            role="EMPLOYEE"
        )

        db.add(user)

        # Save the user temporarily to get its ID
        db.flush()

        # Create the employee profile linked to that user
        employee = Employee(
            user_id=user.id,
            full_name=full_name,
            designation=designation,
            department=department,
            joining_date=data.joining_date,
            salary=data.salary,
            status=data.status
        )

        db.add(employee)

        # Commit both records together
        db.commit()
        db.refresh(employee)

        return employee

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not create the account. The username or email may already exist."
        )

    except Exception:
        db.rollback()
        raise


@app.get(
    "/employees/me",
    response_model=EmployeeResponse
)
def get_my_employee_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Your employee profile has not been created"
        )

    return employee


@app.get(
    "/employees/{employee_id}",
    response_model=EmployeeResponse
)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return employee


@app.put(
    "/employees/{employee_id}",
    response_model=EmployeeResponse
)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if value is None:
            raise HTTPException(
                status_code=422,
                detail=f"{field} cannot be null"
            )

        if isinstance(value, str):
            value = value.strip()

            if not value:
                raise HTTPException(
                    status_code=422,
                    detail=f"{field} cannot be empty"
                )

        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)

    return employee

# MODULE 3: ATTENDANCE MANAGEMENT


def mark_absent_employees(
    db: Session,
    attendance_date: date,
):
    """Create ABSENT attendance records for eligible employees."""

    # Do not mark weekends as absent.
    if attendance_date.weekday() >= 5:
        return 0

    employees = db.query(Employee).filter(
        Employee.status == "ACTIVE",
        Employee.joining_date <= attendance_date,
    ).all()

    absent_count = 0

    try:
        for employee in employees:
            existing_attendance = db.query(Attendance).filter(
                Attendance.employee_id == employee.id,
                Attendance.date == attendance_date,
            ).first()

            if existing_attendance:
                continue

            absent_record = Attendance(
                employee_id=employee.id,
                date=attendance_date,
                check_in=None,
                check_out=None,
                status="ABSENT",
            )

            db.add(absent_record)
            absent_count += 1

        db.commit()
        return absent_count

    except Exception:
        db.rollback()
        raise
    

    

def run_daily_absence_check():
    today = datetime.now(INDIA_TIMEZONE).date()

    # Process the previous working day.
    attendance_date = today - timedelta(days=1)

    while attendance_date.weekday() >= 5:
        attendance_date -= timedelta(days=1)

    db = SessionLocal()

    try:
        count = mark_absent_employees(db, attendance_date)
        print(
            f"Automatic absence check completed for {attendance_date}. "
            f"New absent records: {count}"
        )
    except Exception as error:
        print(f"Automatic absence check failed: {error}")
    finally:
        db.close()


def make_utc_aware(value: datetime) -> datetime:
    """Treat SQLite's naive datetime values as UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def build_attendance_response(
    attendance: Attendance,
    db: Session,
):
    """Calculate attendance details using the assigned shift."""

    working_hours = None
    is_late = False
    late_minutes = 0
    is_early_checkout = False
    early_checkout_minutes = 0
    overtime_hours = None
    shift_name = None

    # 1. Calculate working hours
    if attendance.check_in and attendance.check_out:
        check_in_utc = make_utc_aware(attendance.check_in)
        check_out_utc = make_utc_aware(attendance.check_out)

        duration = check_out_utc - check_in_utc
        working_hours = round(
            duration.total_seconds() / 3600, 2
        )

        overtime_hours = round(
            max(working_hours - 8, 0), 2
        )

    # 2. Find the employee's assigned shift
    assignment = (
        db.query(EmployeeShift)
        .filter(
            EmployeeShift.employee_id == attendance.employee_id
        )
        .first()
    )

    shift = None

    if assignment:
        shift = (
            db.query(Shift)
            .filter(Shift.id == assignment.shift_id)
            .first()
        )

    # 3. Compare attendance with the assigned shift
    if shift:
        shift_name = shift.name

        shift_start = datetime.combine(
            attendance.date,
            shift.start_time,
        ).replace(tzinfo=INDIA_TIMEZONE)

        shift_end_date = attendance.date

        # Night shift ends on the following day
        if shift.end_time <= shift.start_time:
            shift_end_date += timedelta(days=1)

        shift_end = datetime.combine(
            shift_end_date,
            shift.end_time,
        ).replace(tzinfo=INDIA_TIMEZONE)

        if attendance.check_in:
            check_in_utc = make_utc_aware(
                attendance.check_in
            )
            check_in_india = check_in_utc.astimezone(
                INDIA_TIMEZONE
            )

            if check_in_india > shift_start:
                late_minutes = int(
                    (
                        check_in_india - shift_start
                    ).total_seconds() // 60
                )
                is_late = late_minutes > 0

        if attendance.check_out:
            check_out_utc = make_utc_aware(
                attendance.check_out
            )
            check_out_india = check_out_utc.astimezone(
                INDIA_TIMEZONE
            )

            if check_out_india < shift_end:
                early_checkout_minutes = int(
                    (
                        shift_end - check_out_india
                    ).total_seconds() // 60
                )
                is_early_checkout = (
                    early_checkout_minutes > 0
                )

    else:
        # Preserve the existing 9:30 AM rule for employees
        # who have not yet been assigned a shift.
        if attendance.check_in:
            check_in_utc = make_utc_aware(
                attendance.check_in
            )
            check_in_india = check_in_utc.astimezone(
                INDIA_TIMEZONE
            )

            official_check_in = time(9, 30)

            is_late = (
                check_in_india.time().replace(tzinfo=None)
                > official_check_in
            )

    return {
        "id": attendance.id,
        "employee_id": attendance.employee_id,
        "check_in": attendance.check_in,
        "check_out": attendance.check_out,
        "date": attendance.date,
        "status": attendance.status,
        "working_hours": working_hours,
        "is_late": is_late,
        "overtime_hours": overtime_hours,
        "shift_name": shift_name,
        "late_minutes": late_minutes,
        "is_early_checkout": is_early_checkout,
        "early_checkout_minutes": early_checkout_minutes,
    }
    
def auto_mark_absent_employees(db: Session):
    """
    Mark eligible employees absent after their shift starts
    and the 30-minute grace period has passed.
    """

    now_india = datetime.now(INDIA_TIMEZONE)
    today = now_india.date()
    grace_period = timedelta(minutes=30)

    # Find employees who have an assigned shift.
    assignments = db.query(EmployeeShift).all()

    absent_count = 0
    skipped_count = 0

    for assignment in assignments:

        # Find the employee.
        employee = db.query(Employee).filter(
            Employee.id == assignment.employee_id
        ).first()

        if not employee:
            continue

        # Skip inactive employees.
        if (
            employee.status != "ACTIVE"
            or employee.joining_date > today
        ):
            continue

        # Find the employee's assigned shift.
        shift = db.query(Shift).filter(
            Shift.id == assignment.shift_id
        ).first()

        if not shift:
            continue

        # Do not mark absent before the grace period ends.
        shift_start = datetime.combine(
            today,
            shift.start_time.replace(tzinfo=None)
        ).replace(tzinfo=INDIA_TIMEZONE)

        if now_india < shift_start + grace_period:
            continue

        # Skip employees who already have an attendance record.
        existing_attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee.id,
            Attendance.date == today
        ).first()

        if existing_attendance:
            skipped_count += 1
            continue

        # Skip employees who have approved leave today.
        approved_leave = db.query(Leave).filter(
            Leave.employee_id == employee.id,
            Leave.status == "APPROVED",
            Leave.start_date <= today,
            Leave.end_date >= today
        ).first()

        if approved_leave:
            skipped_count += 1
            continue

        # Create an absent attendance record.
        attendance = Attendance(
            employee_id=employee.id,
            date=today,
            check_in=None,
            check_out=None,
            status="ABSENT"
        )

        db.add(attendance)
        db.flush()

        # Notify the employee if their account is linked.
        if employee.user_id:
            create_notification(
                db=db,
                user_id=employee.user_id,
                title="Attendance Alert",
                message=(
                    f"You were marked absent for {today} "
                    f"because no attendance was recorded "
                    f"after your shift's 30-minute grace period."
                )
            )

        absent_count += 1

    db.commit()

    return {
        "date": str(today),
        "absent_marked": absent_count,
        "employees_skipped": skipped_count
    }
    
def run_scheduled_absence_check():
    db = SessionLocal()

    try:
        result = auto_mark_absent_employees(db)
        print(f"Automatic absence check: {result}")

    except Exception as error:
        db.rollback()
        print(f"Automatic absence check failed: {error}")

    finally:
        db.close()



@app.post("/attendance/check-in", response_model=AttendanceResponse)
def check_in(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE")),
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found",
        )

    now_local = datetime.now(INDIA_TIMEZONE)
    today = now_local.date()

    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.date == today,
    ).first()

    if attendance and attendance.check_in:
        raise HTTPException(
            status_code=409,
            detail="You have already checked in today",
        )

    # Find the employee's assigned shift, if available.
    employee_shift = db.query(EmployeeShift).filter(
        EmployeeShift.employee_id == employee.id
    ).first()

    shift = None
    if employee_shift:
        shift = db.query(Shift).filter(
            Shift.id == employee_shift.shift_id
        ).first()

    # Use the assigned shift start time or default to 9:30 AM.
    official_start = (
        shift.start_time if shift else time(9, 30)
    )

    actual_time = now_local.time().replace(tzinfo=None)
    is_late = actual_time > official_start

    if attendance is None:
        attendance = Attendance(
            employee_id=employee.id,
            date=today,
            check_in=datetime.now(timezone.utc),
            status="PRESENT",
        )
        db.add(attendance)
    else:
        attendance.check_in = datetime.now(timezone.utc)
        attendance.status = "PRESENT"

    # Always create the normal check-in notification.
    create_notification(
        db=db,
        user_id=current_user.id,
        title="Attendance Check-In",
        message=(
            f"Your attendance check-in was recorded for {today}."
        ),
    )

    # Create an additional alert if the employee is late.
    if is_late:
        create_notification(
            db=db,
            user_id=current_user.id,
            title="Late Attendance Alert",
            message=(
                f"You checked in at {now_local.strftime('%I:%M %p')}. "
                f"Your scheduled shift starts at "
                f"{official_start.strftime('%I:%M %p')}."
            ),
        )

    db.commit()
    db.refresh(attendance)

    return build_attendance_response(attendance, db)



@app.post("/attendance/check-out", response_model=AttendanceResponse)
def check_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE")),
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found",
        )
        
        

    now_india = datetime.now(INDIA_TIMEZONE)
    today = now_india.date()

    # First, look for an attendance record for today.
    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.date == today,
    ).first()

    # If there is no open record today, look for yesterday's
    # attendance record. This supports overnight shifts.
    if not attendance or not attendance.check_in or attendance.check_out:
        yesterday = today - timedelta(days=1)

        previous_attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee.id,
            Attendance.date == yesterday,
            Attendance.check_out.is_(None),
        ).order_by(Attendance.id.desc()).first()

        if previous_attendance and previous_attendance.check_in:
            assignment = db.query(EmployeeShift).filter(
                EmployeeShift.employee_id == employee.id
            ).first()

            shift = None
            if assignment:
                shift = db.query(Shift).filter(
                    Shift.id == assignment.shift_id
                ).first()

            if shift and shift.end_time <= shift.start_time:
                attendance = previous_attendance

    if not attendance or not attendance.check_in:
        raise HTTPException(
            status_code=400,
            detail="Please check in before checking out",
        )

    if attendance.check_out:
        raise HTTPException(
            status_code=409,
            detail="You have already checked out today",
        )

    attendance.check_out = datetime.now(timezone.utc)
    
    check_in_time = make_utc_aware(attendance.check_in)
    check_out_time = make_utc_aware(attendance.check_out)

    duration = check_out_time - check_in_time
    hours = duration.total_seconds() / 3600

    # Assignment rule: less than 4 hours is HALF_DAY.
    # 4 hours or more is PRESENT.
    attendance.status = "HALF_DAY" if hours < 4 else "PRESENT"

    create_notification(
        db=db,
        user_id=current_user.id,
        title="Attendance Check-Out",
        message=(
            f"Your check-out was recorded for {attendance.date}. "
            f"Working hours: {round(hours, 2)}. "
            f"Attendance status: {attendance.status}."
        ),
    )

    db.commit()
    db.refresh(attendance)

    return build_attendance_response(attendance,db)


@app.get("/attendance/me", response_model=list[AttendanceResponse])
def my_attendance_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE")),
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found",
        )

    records = db.query(Attendance).filter(
        Attendance.employee_id == employee.id
    ).order_by(Attendance.date.desc()).all()

    return [
        build_attendance_response(record,db)
        for record in records
    ]


@app.get("/attendance", response_model=list[AttendanceResponse])
def list_attendance(
    employee_id: int | None = Query(default=None, gt=0),
    attendance_date: date | None = Query(default=None, alias="date"),
    attendance_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(PRESENT|ABSENT|HALF_DAY)$",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    query = db.query(Attendance)

    if employee_id is not None:
        query = query.filter(Attendance.employee_id == employee_id)

    if attendance_date is not None:
        query = query.filter(Attendance.date == attendance_date)

    if attendance_status is not None:
        query = query.filter(Attendance.status == attendance_status)

    records = query.order_by(Attendance.date.desc()).all()

    return [
        build_attendance_response(record,db)
        for record in records
    ]

@app.post("/attendance/run-absence-check")
def run_absence_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    return auto_mark_absent_employees(db)

# ==========================================================
# MODULE 4: LEAVE MANAGEMENT
# ==========================================================


# EMPLOYEE: APPLY FOR LEAVE
@app.post(
    "/leaves",
    response_model=LeaveResponse,
    status_code=status.HTTP_201_CREATED
)
def apply_for_leave(
    data: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE"))
):
    # Find the logged-in employee's profile
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    # Validate leave dates
    if data.end_date < data.start_date:
        raise HTTPException(
            status_code=422,
            detail="End date cannot be before start date"
        )

    # Validate reason
    reason = data.reason.strip()

    if len(reason) < 3:
        raise HTTPException(
            status_code=422,
            detail="Reason must contain at least 3 characters"
        )

    # Create the leave request
    leave = Leave(
        employee_id=employee.id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=reason,
        status="PENDING"
    )

    db.add(leave)
    db.commit()
    db.refresh(leave)

    return leave


# EMPLOYEE: VIEW OWN LEAVE HISTORY
@app.get(
    "/leaves/me",
    response_model=list[LeaveResponse]
)
def my_leave_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE"))
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    return db.query(Leave).filter(
        Leave.employee_id == employee.id
    ).order_by(Leave.id.desc()).all()


# HR/ADMIN: VIEW ALL LEAVE REQUESTS
@app.get(
    "/leaves",
    response_model=list[LeaveResponse]
)
def list_all_leaves(
    leave_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(PENDING|APPROVED|REJECTED)$"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    query = db.query(Leave)

    if leave_status:
        query = query.filter(Leave.status == leave_status)

    return query.order_by(Leave.id.desc()).all()



# HR/ADMIN: APPROVE OR REJECT LEAVE
@app.patch(
    "/leaves/{leave_id}/decision",
    response_model=LeaveResponse
)
def decide_leave(
    leave_id: int,
    data: LeaveDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    # 1. Find the leave request
    leave = db.query(Leave).filter(
        Leave.id == leave_id
    ).first()

    if not leave:
        raise HTTPException(
            status_code=404,
            detail="Leave request not found"
        )

    # 2. Only pending requests can be decided
    if leave.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="This leave request has already been reviewed"
        )

    # 3. Accept only APPROVED or REJECTED
    if data.status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be APPROVED or REJECTED"
        )

    # 4. Find the employee
    employee = db.query(Employee).filter(
        Employee.id == leave.employee_id
    ).first()

    # 5. Deduct balance only when approving
    if data.status == "APPROVED":
        
        # Prevent overlapping approved leaves for the same employee
        conflicting_leave = db.query(Leave).filter(
            Leave.employee_id == leave.employee_id,
            Leave.id != leave.id,
            Leave.status == "APPROVED",
            Leave.start_date <= leave.end_date,
            Leave.end_date >= leave.start_date
        ).first()

        if conflicting_leave:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Leave cannot be approved because this employee "
                    "already has an approved leave that overlaps "
                    "the requested dates "
                    f"({conflicting_leave.start_date} to "
                    f"{conflicting_leave.end_date})."
                )
            )


        # Calculate inclusive calendar days
        requested_days = (
            leave.end_date - leave.start_date
        ).days + 1

        if requested_days <= 0:
            raise HTTPException(
                status_code=400,
                detail="Leave end date must not be before start date"
            )

        # Find this employee's balance for this leave type
        balance = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == leave.employee_id,
            LeaveBalance.leave_type == leave.leave_type
        ).first()

        if not balance:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No {leave.leave_type} leave balance exists "
                    "for this employee"
                )
            )

        # Prevent over-usage
        if balance.remaining_days < requested_days:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Insufficient {leave.leave_type} leave balance. "
                    f"Available: {balance.remaining_days} days; "
                    f"Requested: {requested_days} days."
                )
            )

        # Deduct the approved leave days
        balance.remaining_days -= requested_days

    # 6. Update the leave status
    leave.status = data.status

    # 7. Notify the employee
    if employee:
        create_notification(
            db=db,
            user_id=employee.user_id,
            title=f"Leave {leave.status.title()}",
            message=(
                f"Your {leave.leave_type.lower()} leave request "
                f"from {leave.start_date} to {leave.end_date} "
                f"has been {leave.status.lower()}."
            ),
        )

    # 8. Save the balance, decision and notification together
    try:
        db.commit()
        db.refresh(leave)
    except Exception:
        db.rollback()
        raise

    return leave


# MODULE 15: LEAVE CALENDAR
@app.get(
    "/leave-calendar",
    response_model=list[LeaveCalendarItem]
)
def get_leave_calendar(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    department: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE", "HR", "ADMIN"))
):
    # Validate the requested date range
    if start_date and end_date and end_date < start_date:
        raise HTTPException(
            status_code=422,
            detail="End date cannot be before start date"
        )

    # Employees can only see their own department's calendar
    employee_department = None

    if current_user.role == "EMPLOYEE":
        current_employee = db.query(Employee).filter(
            Employee.user_id == current_user.id
        ).first()

        if not current_employee:
            raise HTTPException(
                status_code=404,
                detail="Employee profile not found"
            )

        employee_department = current_employee.department

        if department and department != employee_department:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own department's calendar"
            )

    # Include only approved leave requests
    query = (
        db.query(Leave, Employee)
        .join(Employee, Leave.employee_id == Employee.id)
        .filter(Leave.status == "APPROVED")
    )

    # Include leaves overlapping the requested date range
    if start_date:
        query = query.filter(Leave.end_date >= start_date)

    if end_date:
        query = query.filter(Leave.start_date <= end_date)

    # Apply department restrictions and optional filters
    if employee_department is not None:
        query = query.filter(
            Employee.department == employee_department
        )
    elif department:
        query = query.filter(
            Employee.department == department
        )

    results = query.order_by(Leave.start_date.asc()).all()

    return [
        LeaveCalendarItem(
            leave_id=leave.id,
            employee_id=employee.id,
            employee_name=employee.full_name,
            department=employee.department,
            leave_type=leave.leave_type,
            start_date=leave.start_date,
            end_date=leave.end_date,
            status=leave.status
        )
        for leave, employee in results
    ]


# MODULE 15: TEAM AVAILABILITY
@app.get(
    "/team-availability",
    response_model=list[TeamAvailabilityItem]
)
def get_team_availability(
    selected_date: date = Query(default_factory=date.today),
    department: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE", "HR", "ADMIN"))
):
    # Employees can only view availability in their own department
    employee_department = None

    if current_user.role == "EMPLOYEE":
        current_employee = db.query(Employee).filter(
            Employee.user_id == current_user.id
        ).first()

        if not current_employee:
            raise HTTPException(
                status_code=404,
                detail="Employee profile not found"
            )

        employee_department = current_employee.department

        if department and department != employee_department:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own department's availability"
            )

    employee_query = db.query(Employee).filter(
        Employee.status == "ACTIVE",
        Employee.joining_date <= selected_date
    )

    if employee_department is not None:
        employee_query = employee_query.filter(
            Employee.department == employee_department
        )
    elif department:
        employee_query = employee_query.filter(
            Employee.department == department
        )

    employees = employee_query.order_by(Employee.full_name.asc()).all()

    response = []

    for employee in employees:
        approved_leave = db.query(Leave).filter(
            Leave.employee_id == employee.id,
            Leave.status == "APPROVED",
            Leave.start_date <= selected_date,
            Leave.end_date >= selected_date
        ).first()

        if approved_leave:
            response.append(
                TeamAvailabilityItem(
                    employee_id=employee.id,
                    employee_name=employee.full_name,
                    department=employee.department,
                    availability="ON_LEAVE",
                    leave_type=approved_leave.leave_type,
                    leave_start_date=approved_leave.start_date,
                    leave_end_date=approved_leave.end_date
                )
            )
        else:
            response.append(
                TeamAvailabilityItem(
                    employee_id=employee.id,
                    employee_name=employee.full_name,
                    department=employee.department,
                    availability="AVAILABLE"
                )
            )

    return response



# ==========================================================
# MODULE 11: LEAVE POLICIES AND LEAVE BALANCES
# ==========================================================

# HR/ADMIN: CREATE A LEAVE POLICY
@app.post(
    "/leave-policies",
    response_model=LeavePolicyResponse,
    status_code=status.HTTP_201_CREATED
)
def create_leave_policy(
    data: LeavePolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    leave_type = data.leave_type.strip().upper()

    if leave_type not in ["SICK", "CASUAL", "PAID"]:
        raise HTTPException(
            status_code=422,
            detail="Leave type must be SICK, CASUAL, or PAID"
        )

    existing_policy = db.query(LeavePolicy).filter(
        LeavePolicy.leave_type == leave_type
    ).first()

    if existing_policy:
        raise HTTPException(
            status_code=409,
            detail="Policy already exists for this leave type"
        )

    policy = LeavePolicy(
        leave_type=leave_type,
        total_days_allowed=data.total_days_allowed
    )

    db.add(policy)
    db.commit()
    db.refresh(policy)

    return policy


# HR/ADMIN: VIEW ALL LEAVE POLICIES
@app.get(
    "/leave-policies",
    response_model=list[LeavePolicyResponse]
)
def list_leave_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    return db.query(LeavePolicy).order_by(
        LeavePolicy.id
    ).all()


# HR/ADMIN: CREATE AN EMPLOYEE LEAVE BALANCE
@app.post(
    "/leave-balances",
    response_model=LeaveBalanceResponse,
    status_code=status.HTTP_201_CREATED
)
def create_leave_balance(
    data: LeaveBalanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    leave_type = data.leave_type.strip().upper()

    if leave_type not in ["SICK", "CASUAL", "PAID"]:
        raise HTTPException(
            status_code=422,
            detail="Leave type must be SICK, CASUAL, or PAID"
        )

    employee = db.query(Employee).filter(
        Employee.id == data.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    policy = db.query(LeavePolicy).filter(
        LeavePolicy.leave_type == leave_type
    ).first()

    if not policy:
        raise HTTPException(
            status_code=400,
            detail="Create a leave policy for this leave type first"
        )

    existing_balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == data.employee_id,
        LeaveBalance.leave_type == leave_type
    ).first()

    if existing_balance:
        raise HTTPException(
            status_code=409,
            detail="Leave balance already exists for this employee and leave type"
        )

    if data.remaining_days > policy.total_days_allowed:
        raise HTTPException(
            status_code=422,
            detail=(
                "Remaining days cannot exceed the policy limit of "
                f"{policy.total_days_allowed}"
            )
        )

    balance = LeaveBalance(
        employee_id=data.employee_id,
        leave_type=leave_type,
        remaining_days=data.remaining_days
    )

    db.add(balance)
    db.commit()
    db.refresh(balance)

    return balance


# EMPLOYEE: VIEW LEAVE POLICIES
@app.get(
    "/leave-policies/overview",
    response_model=list[LeavePolicyResponse]
)
def get_leave_policy_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(LeavePolicy).order_by(
        LeavePolicy.id
    ).all()


# EMPLOYEE: VIEW OWN LEAVE BALANCES
@app.get(
    "/leave-balances/me",
    response_model=list[LeaveBalanceResponse]
)
def get_my_leave_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE"))
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found for this account"
        )

    return db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee.id
    ).order_by(
        LeaveBalance.id
    ).all()


# HR/ADMIN: VIEW EMPLOYEE LEAVE BALANCES
@app.get(
    "/leave-balances",
    response_model=list[LeaveBalanceResponse]
)
def list_leave_balances(
    employee_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    query = db.query(LeaveBalance)

    if employee_id is not None:
        query = query.filter(
            LeaveBalance.employee_id == employee_id
        )

    return query.order_by(
        LeaveBalance.employee_id,
        LeaveBalance.leave_type
    ).all()


# ==========================================================
# MODULE 5: PAYROLL MANAGEMENT
# ==========================================================

# Generate payroll - HR and Admin only
@app.post(
    "/payroll",
    response_model=PayrollResponse,
    status_code=status.HTTP_201_CREATED
)
def generate_payroll(
    data: PayrollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # Prevent duplicate payroll for the same employee and month
    existing_payroll = db.query(Payroll).filter(
        Payroll.employee_id == data.employee_id,
        Payroll.month == data.month
    ).first()

    if existing_payroll:
        raise HTTPException(
            status_code=409,
            detail="Payroll already exists for this employee and month"
        )

    net_salary = (
        data.basic_salary
        + data.allowances
        + data.bonus
        - data.deductions
    )

    
    if net_salary < 0:
        raise HTTPException(
            status_code=422,
            detail=(
                "Deductions cannot exceed basic salary, "
                "allowances, and bonus"
            )
        )


    payroll = Payroll(
        employee_id=data.employee_id,
        basic_salary=data.basic_salary,
        allowances=data.allowances,
        deductions=data.deductions,
        bonus=data.bonus,
        net_salary=net_salary,
        month=data.month
    )

    db.add(payroll)

    create_notification(
        db=db,
        user_id=employee.user_id,
        title="Payroll Updated",
        message=(
            f"Your payroll for {payroll.month} has been generated. "
            f"Net salary: ₹{net_salary:.2f}."
        ),
    )

    db.commit()
    db.refresh(payroll)

    return payroll


# MODULE 12: MONTHLY PAYROLL SUMMARY

@app.get("/payroll/summary")
def payroll_summary(
    month: str = Query(
        ...,
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    summary = db.query(
        func.count(Payroll.id).label("total_records"),
        func.coalesce(
            func.sum(Payroll.basic_salary), 0
        ).label("total_basic_salary"),
        func.coalesce(
            func.sum(Payroll.allowances), 0
        ).label("total_allowances"),
        func.coalesce(
            func.sum(Payroll.bonus), 0
        ).label("total_bonus"),
        func.coalesce(
            func.sum(Payroll.deductions), 0
        ).label("total_deductions"),
        func.coalesce(
            func.sum(Payroll.net_salary), 0
        ).label("total_net_salary")
    ).filter(
        Payroll.month == month
    ).first()

    return {
        "month": month,
        "total_records": summary.total_records,
        "total_basic_salary": float(summary.total_basic_salary),
        "total_allowances": float(summary.total_allowances),
        "total_bonus": float(summary.total_bonus),
        "total_deductions": float(summary.total_deductions),
        "total_net_salary": float(summary.total_net_salary)
    }


# View all payroll records - HR and Admin only
@app.get(
    "/payroll",
    response_model=list[PayrollResponse]
)
def list_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    return db.query(Payroll).order_by(
        Payroll.month.desc(),
        Payroll.id.desc()
    ).all()


# View own salary details - Employee only
@app.get(
    "/payroll/me",
    response_model=list[PayrollResponse]
)
def my_payroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE"))
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    return db.query(Payroll).filter(
        Payroll.employee_id == employee.id
    ).order_by(Payroll.month.desc()).all()


# View one employee's salary details - HR and Admin only
@app.get(
    "/payroll/employee/{employee_id}",
    response_model=list[PayrollResponse]
)
def employee_payroll(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return db.query(Payroll).filter(
        Payroll.employee_id == employee_id
    ).order_by(Payroll.month.desc()).all()



# ==========================================================
# MODULE 6: DASHBOARD & ANALYTICS
# ==========================================================

@app.get("/analytics/dashboard")
def dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    # 1. Total employees
    total_employees = db.query(
        func.count(Employee.id)
    ).scalar() or 0

    # 2. Attendance summary
    attendance_rows = db.query(
        Attendance.status,
        func.count(Attendance.id)
    ).group_by(Attendance.status).all()

    attendance_counts = {
        "PRESENT": 0,
        "HALF_DAY": 0,
        "ABSENT": 0
    }

    for attendance_status, count in attendance_rows:
        if attendance_status in attendance_counts:
            attendance_counts[attendance_status] = count

    # 3. Leave statistics
    leave_rows = db.query(
        Leave.status,
        func.count(Leave.id)
    ).group_by(Leave.status).all()

    leave_counts = {
        "PENDING": 0,
        "APPROVED": 0,
        "REJECTED": 0
    }

    for leave_status, count in leave_rows:
        if leave_status in leave_counts:
            leave_counts[leave_status] = count

    # 4. Payroll overview
    total_payroll_records = db.query(
        func.count(Payroll.id)
    ).scalar() or 0

    total_net_payroll = db.query(
        func.coalesce(func.sum(Payroll.net_salary), 0)
    ).scalar()

    return {
        "total_employees": total_employees,
        "attendance_summary": attendance_counts,
        "leave_statistics": leave_counts,
        "payroll_overview": {
            "total_records": total_payroll_records,
            "total_net_payroll": float(total_net_payroll)
        }
    }
    

# ==========================================================
# MODULE 18: ADVANCED ANALYTICS & REPORTS
# ==========================================================

@app.get("/analytics/advanced")
def advanced_analytics(
    start_date: date | None = None,
    end_date: date | None = None,
    department: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    # Validate date filters
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be after end_date",
        )

    # Base employee query
    employee_query = db.query(Employee)

    if department:
        employee_query = employee_query.filter(
            Employee.department == department
        )

    employees = employee_query.order_by(Employee.id).all()
    employee_ids = [employee.id for employee in employees]

    # Empty result when no employees match the department
    if not employee_ids:
        return {
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
                "department": department,
            },
            "attendance_trends": [],
            "leave_trends": [],
            "performance_insights": {
                "average_rating": 0,
                "total_reviews": 0,
                "rating_distribution": {
                    "1.0-1.9": 0,
                    "2.0-2.9": 0,
                    "3.0-3.9": 0,
                    "4.0-4.9": 0,
                    "5.0": 0,
                },  
            },
            "department_reports": [],
        }

    # ------------------------------------------------------
    # 1. ATTENDANCE TRENDS
    # ------------------------------------------------------
    attendance_query = db.query(
        Attendance.date,
        Attendance.status,
        func.count(Attendance.id).label("total"),
    ).filter(
        Attendance.employee_id.in_(employee_ids)
    )

    if start_date:
        attendance_query = attendance_query.filter(
            Attendance.date >= start_date
        )

    if end_date:
        attendance_query = attendance_query.filter(
            Attendance.date <= end_date
        )

    attendance_rows = attendance_query.group_by(
        Attendance.date,
        Attendance.status,
    ).order_by(
        Attendance.date
    ).all()

    attendance_by_date = {}

    for attendance_date, attendance_status, total in attendance_rows:
        day = attendance_date.isoformat()

        if day not in attendance_by_date:
            attendance_by_date[day] = {
                "date": day,
                "PRESENT": 0,
                "HALF_DAY": 0,
                "ABSENT": 0,
            }

        if attendance_status in attendance_by_date[day]:
            attendance_by_date[day][attendance_status] = total

    attendance_trends = list(attendance_by_date.values())

    # ------------------------------------------------------
    # 2. LEAVE TRENDS
    # Include leave requests overlapping the selected period.
    # ------------------------------------------------------
    leave_query = db.query(
        Leave.start_date,
        Leave.status,
        func.count(Leave.id).label("total"),
    ).filter(
        Leave.employee_id.in_(employee_ids)
    )

    if start_date:
        leave_query = leave_query.filter(
            Leave.end_date >= start_date
        )

    if end_date:
        leave_query = leave_query.filter(
            Leave.start_date <= end_date
        )

    leave_rows = leave_query.group_by(
        Leave.start_date,
        Leave.status,
    ).order_by(
        Leave.start_date
    ).all()

    leave_by_date = {}

    for leave_date, leave_status, total in leave_rows:
        day = leave_date.isoformat()

        if day not in leave_by_date:
            leave_by_date[day] = {
                "date": day,
                "PENDING": 0,
                "APPROVED": 0,
                "REJECTED": 0,
            }

        if leave_status in leave_by_date[day]:
            leave_by_date[day][leave_status] = total

    leave_trends = list(leave_by_date.values())

    # ------------------------------------------------------
    # 3. EMPLOYEE PERFORMANCE INSIGHTS
    # ------------------------------------------------------
    performance_query = db.query(
        PerformanceReview
    ).filter(
        PerformanceReview.employee_id.in_(employee_ids)
    )

    if start_date:
        performance_query = performance_query.filter(
            func.date(PerformanceReview.created_at)
            >= start_date.isoformat()
        )

    if end_date:
        performance_query = performance_query.filter(
            func.date(PerformanceReview.created_at)
            <= end_date.isoformat()
        )

    performance_reviews = performance_query.all()

    total_reviews = len(performance_reviews)

    average_rating = (
        round(
            sum(review.rating for review in performance_reviews)
            / total_reviews,
            2,
        )
        if total_reviews
        else 0
    )

    
    rating_distribution = {
        "1.0-1.9": 0,
        "2.0-2.9": 0,
        "3.0-3.9": 0,
        "4.0-4.9": 0,
        "5.0": 0,
    }

    for review in performance_reviews:
        rating = review.rating

        if 1 <= rating < 2:
            rating_distribution["1.0-1.9"] += 1
        elif 2 <= rating < 3:
            rating_distribution["2.0-2.9"] += 1
        elif 3 <= rating < 4:
            rating_distribution["3.0-3.9"] += 1
        elif 4 <= rating < 5:
            rating_distribution["4.0-4.9"] += 1
        elif rating == 5:
            rating_distribution["5.0"] += 1


    performance_insights = {
        "average_rating": average_rating,
        "total_reviews": total_reviews,
        "rating_distribution": rating_distribution,
    }

    # ------------------------------------------------------
    # 4. DEPARTMENT-WISE REPORTS
    # ------------------------------------------------------
    department_reports = []

    departments = sorted({
        employee.department for employee in employees
    })

    for department_name in departments:
        department_employees = [
            employee for employee in employees
            if employee.department == department_name
        ]

        department_employee_ids = [
            employee.id for employee in department_employees
        ]

        department_attendance_query = db.query(
            Attendance.status,
            func.count(Attendance.id),
        ).filter(
            Attendance.employee_id.in_(department_employee_ids)
        )

        if start_date:
            department_attendance_query = (
                department_attendance_query.filter(
                    Attendance.date >= start_date
                )
            )

        if end_date:
            department_attendance_query = (
                department_attendance_query.filter(
                    Attendance.date <= end_date
                )
            )

        department_attendance_rows = (
            department_attendance_query.group_by(
                Attendance.status
            ).all()
        )

        attendance_summary = {
            "PRESENT": 0,
            "HALF_DAY": 0,
            "ABSENT": 0,
        }

        for attendance_status, total in department_attendance_rows:
            if attendance_status in attendance_summary:
                attendance_summary[attendance_status] = total

        department_leave_query = db.query(
            Leave.status,
            func.count(Leave.id),
        ).filter(
            Leave.employee_id.in_(department_employee_ids)
        )

        if start_date:
            department_leave_query = department_leave_query.filter(
                Leave.end_date >= start_date
            )

        if end_date:
            department_leave_query = department_leave_query.filter(
                Leave.start_date <= end_date
            )

        department_leave_rows = department_leave_query.group_by(
            Leave.status
        ).all()

        leave_summary = {
            "PENDING": 0,
            "APPROVED": 0,
            "REJECTED": 0,
        }

        for leave_status, total in department_leave_rows:
            if leave_status in leave_summary:
                leave_summary[leave_status] = total

        department_performance_query = db.query(
            func.avg(PerformanceReview.rating),
            func.count(PerformanceReview.id),
        ).filter(
            PerformanceReview.employee_id.in_(
                department_employee_ids
            )
        )

        if start_date:
            department_performance_query = (
                department_performance_query.filter(
                    func.date(PerformanceReview.created_at)
                    >= start_date.isoformat()
                )
            )

        if end_date:
            department_performance_query = (
                department_performance_query.filter(
                    func.date(PerformanceReview.created_at)
                    <= end_date.isoformat()
                )
            )

        avg_rating, review_count = (
            department_performance_query.one()
        )

        department_reports.append({
            "department": department_name,
            "total_employees": len(department_employees),
            "attendance_summary": attendance_summary,
            "leave_summary": leave_summary,
            "average_performance_rating": (
                round(float(avg_rating), 2)
                if avg_rating is not None
                else 0
            ),
            "total_performance_reviews": review_count or 0,
        })

    return {
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "department": department,
        },
        "attendance_trends": attendance_trends,
        "leave_trends": leave_trends,
        "performance_insights": performance_insights,
        "department_reports": department_reports,
    }


# ==========================================================
# MODULE 7: NOTIFICATION APIs
# ==========================================================

# View notifications belonging to the logged-in user
@app.get("/notifications")
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(
        Notification.created_at.desc(),
        Notification.id.desc()
    ).all()

    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "title": item.title,
            "message": item.message,
            "is_read": item.is_read,
            "created_at": item.created_at,
        }
        for item in notifications
    ]


# Mark one of the logged-in user's notifications as read
@app.patch("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return {
        "message": "Notification marked as read",
        "id": notification.id,
        "is_read": notification.is_read,
    }
    
@app.post("/shifts", response_model=ShiftResponse)
def create_shift(
    shift_data: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    existing_shift = db.query(Shift).filter(
        Shift.name == shift_data.name
    ).first()

    if existing_shift:
        raise HTTPException(
            status_code=409,
            detail="A shift with this name already exists",
        )

    shift = Shift(
        name=shift_data.name,
        start_time=shift_data.start_time,
        end_time=shift_data.end_time,
    )

    db.add(shift)
    db.commit()
    db.refresh(shift)

    return shift


@app.get("/shifts", response_model=list[ShiftResponse])
def list_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    return db.query(Shift).order_by(Shift.id).all()


@app.post(
    "/employee-shifts",
    response_model=EmployeeShiftResponse,
)
def assign_employee_shift(
    assignment_data: EmployeeShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    employee = db.query(Employee).filter(
        Employee.id == assignment_data.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    shift = db.query(Shift).filter(
        Shift.id == assignment_data.shift_id
    ).first()

    if not shift:
        raise HTTPException(
            status_code=404,
            detail="Shift not found",
        )

    assignment = db.query(EmployeeShift).filter(
        EmployeeShift.employee_id == assignment_data.employee_id
    ).first()

    if assignment:
        assignment.shift_id = assignment_data.shift_id
    else:
        assignment = EmployeeShift(
            employee_id=assignment_data.employee_id,
            shift_id=assignment_data.shift_id,
        )
        db.add(assignment)

    db.commit()
    db.refresh(assignment)

    return assignment

@app.get(
    "/employee-shifts",
    response_model=list[EmployeeShiftResponse],
)
def list_employee_shifts(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    query = db.query(EmployeeShift)

    if employee_id is not None:
        if employee_id <= 0:
            raise HTTPException(
                status_code=422,
                detail="employee_id must be greater than zero",
            )

        query = query.filter(
            EmployeeShift.employee_id == employee_id
        )

    return query.order_by(EmployeeShift.employee_id).all()

# ==========================================================
# MODULE 16: DOCUMENT MANAGEMENT
# ==========================================================


ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"
}
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10 MB


def get_employee_for_document_access(
    current_user: User,
    db: Session,
    employee_id: int | None = None,
) -> Employee:
    """Resolve the employee and enforce document access permissions."""

    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(
            Employee.user_id == current_user.id
        ).first()

        if employee is None:
            raise HTTPException(
                status_code=404,
                detail="Employee profile not found."
            )

        if employee_id is not None and employee.id != employee_id:
            raise HTTPException(
                status_code=403,
                detail="You can access only your own documents."
            )

        return employee

    if current_user.role in {"HR", "ADMIN"}:
        if employee_id is None:
            raise HTTPException(
                status_code=400,
                detail="employee_id is required for HR/Admin access."
            )

        employee = db.query(Employee).filter(
            Employee.id == employee_id
        ).first()

        if employee is None:
            raise HTTPException(
                status_code=404,
                detail="Employee not found."
            )

        return employee

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to access documents."
    )


@app.post("/documents/upload", response_model=DocumentResponse)
async def upload_employee_document(
    employee_id: int | None = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = get_employee_for_document_access(
        current_user=current_user,
        db=db,
        employee_id=employee_id,
    )

    original_name = Path(file.filename or "").name
    extension = Path(original_name).suffix.lower()

    if not original_name or extension not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload PDF, PNG, JPG, DOC, or DOCX."
        )

    stored_name = f"{uuid.uuid4().hex}{extension}"
    destination = DOCUMENTS_DIR / stored_name
    size = 0

    try:
        with destination.open("wb") as output:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                size += len(chunk)

                if size > MAX_DOCUMENT_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File size exceeds the 10 MB limit."
                    )

                output.write(chunk)

        document = Document(
            employee_id=employee.id,
            file_name=original_name,
            file_url=stored_name,
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        return document

    except Exception:
        if destination.exists():
            destination.unlink()
        db.rollback()
        raise

    finally:
        await file.close()


@app.get("/documents", response_model=list[DocumentResponse])
def list_employee_documents(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = get_employee_for_document_access(
        current_user=current_user,
        db=db,
        employee_id=employee_id,
    )

    return (
        db.query(Document)
        .filter(Document.employee_id == employee.id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )


@app.get("/documents/{document_id}/download")
def download_employee_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.query(Document).filter(
        Document.id == document_id
    ).first()

    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    get_employee_for_document_access(
        current_user=current_user,
        db=db,
        employee_id=document.employee_id,
    )

    stored_name = Path(document.file_url).name
    file_path = DOCUMENTS_DIR / stored_name

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Stored document file not found."
        )

    return FileResponse(
        path=file_path,
        filename=document.file_name,
        media_type="application/octet-stream",
    )
    

# ==========================================================
# MODULE 17: PERFORMANCE MANAGEMENT
# ==========================================================


# HR / ADMIN: Add a performance review
@app.post(
    "/performance-reviews",
    response_model=PerformanceReviewResponse,
    status_code=status.HTTP_201_CREATED
)
def create_performance_review(
    data: PerformanceReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id
    ).first()

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    review = PerformanceReview(
        employee_id=data.employee_id,
        review_period=data.review_period.strip(),
        rating=data.rating,
        feedback=data.feedback.strip()
    )

    if not review.review_period or not review.feedback:
        raise HTTPException(
            status_code=422,
            detail="Review period and feedback cannot be empty"
        )

    try:
        db.add(review)
        db.commit()
        db.refresh(review)
        return review
    except Exception:
        db.rollback()
        raise


# HR / ADMIN: View all reviews, optionally filtered by employee
@app.get(
    "/performance-reviews",
    response_model=list[PerformanceReviewResponse]
)
def list_performance_reviews(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    query = db.query(PerformanceReview)

    if employee_id is not None:
        query = query.filter(
            PerformanceReview.employee_id == employee_id
        )

    return query.order_by(
        PerformanceReview.created_at.desc()
    ).all()


# EMPLOYEE: View only their own performance reviews
@app.get(
    "/performance-reviews/me",
    response_model=list[PerformanceReviewResponse]
)
def get_my_performance_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE"))
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Your employee profile has not been created"
        )

    return db.query(PerformanceReview).filter(
        PerformanceReview.employee_id == employee.id
    ).order_by(
        PerformanceReview.created_at.desc()
    ).all()


# ==========================================================
# MODULE 21: EMPLOYEE ONBOARDING
# ==========================================================

# HR / ADMIN: Assign an onboarding task to an employee
@app.post(
    "/onboarding",
    response_model=OnboardingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_onboarding_task(
    data: OnboardingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id
    ).first()

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    task = Onboarding(
        employee_id=data.employee_id,
        task_name=data.task_name.strip(),
        status="PENDING",
        due_date=data.due_date,
    )

    if not task.task_name:
        raise HTTPException(
            status_code=422,
            detail="Task name cannot be empty",
        )

    db.add(task)
    db.commit()
    db.refresh(task)

    # Send an email notification when possible.
    # Email failure must not undo a successfully assigned task.
    try:
        employee_account = db.query(User).filter(
            User.id == employee.user_id
        ).first()

        employee_email = (
            getattr(employee_account, "email", None)
            if employee_account
            else None
        )

        if employee_email:
            send_email(
                to_email=employee_email,
                subject=f"New WorkSphere Task: {task.title}",
                body=(
                    f"Hello {getattr(employee, 'full_name', 'Employee')},\n\n"
                    f"A new task has been assigned to you.\n\n"
                    f"Task: {task.title}\n"
                    f"Description: {task.description}\n"
                    f"Due date: {task.due_date}\n\n"
                    "Please log in to WorkSphere HRMS to review your task."
                )
            )
    except Exception:
        # SMTP may be unconfigured or temporarily unavailable.
        # Keep the task assignment successful.
        pass

    return task

# HR / ADMIN: View all onboarding tasks
@app.get(
    "/onboarding",
    response_model=list[OnboardingResponse],
)
def list_onboarding_tasks(
    employee_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    query = db.query(Onboarding)

    if employee_id is not None:
        query = query.filter(
            Onboarding.employee_id == employee_id
        )

    return query.order_by(
        Onboarding.due_date,
        Onboarding.id,
    ).all()


# EMPLOYEE: View own onboarding checklist
@app.get(
    "/onboarding/me",
    response_model=list[OnboardingResponse],
)
def get_my_onboarding_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE")),
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found",
        )

    return db.query(Onboarding).filter(
        Onboarding.employee_id == employee.id
    ).order_by(
        Onboarding.due_date,
        Onboarding.id,
    ).all()


# EMPLOYEE: View onboarding progress
@app.get("/onboarding/me/progress")
def get_my_onboarding_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE")),
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found",
        )

    tasks = db.query(Onboarding).filter(
        Onboarding.employee_id == employee.id
    ).all()

    total_tasks = len(tasks)
    completed_tasks = sum(
        1 for task in tasks
        if task.status == "COMPLETED"
    )
    pending_tasks = total_tasks - completed_tasks

    progress_percentage = (
        round(completed_tasks / total_tasks * 100, 2)
        if total_tasks > 0
        else 0
    )

    return {
        "employee_id": employee.id,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "progress_percentage": progress_percentage,
    }


# EMPLOYEE: Update own task status
# HR / ADMIN: Update any onboarding task status
@app.patch(
    "/onboarding/{task_id}/status",
    response_model=OnboardingResponse,
)
def update_onboarding_status(
    task_id: int,
    data: OnboardingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Onboarding).filter(
        Onboarding.id == task_id
    ).first()

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Onboarding task not found",
        )

    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(
            Employee.user_id == current_user.id
        ).first()

        if employee is None:
            raise HTTPException(
                status_code=404,
                detail="Employee profile not found",
            )

        if task.employee_id != employee.id:
            raise HTTPException(
                status_code=403,
                detail="You can update only your own onboarding tasks",
            )

    elif current_user.role not in ("HR", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update onboarding tasks",
        )

    task.status = data.status

    db.commit()
    db.refresh(task)

    return task


# ==========================================================
# MODULE 22: RESIGNATION & EXIT MANAGEMENT
# ==========================================================


# EMPLOYEE: Submit resignation
@app.post(
    "/resignations",
    response_model=ResignationResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_resignation(
    data: ResignationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE")),
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found",
        )

    # Prevent multiple pending resignation requests
    existing = db.query(Resignation).filter(
        Resignation.employee_id == employee.id,
        Resignation.status == "PENDING",
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending resignation request",
        )

    reason = data.reason.strip()

    if not reason:
        raise HTTPException(
            status_code=422,
            detail="Resignation reason cannot be empty",
        )

    resignation = Resignation(
        employee_id=employee.id,
        reason=reason,
        notice_period=data.notice_period,
        status="PENDING",
    )

    db.add(resignation)
    db.commit()
    db.refresh(resignation)

    return resignation


# EMPLOYEE: View own resignation requests
@app.get(
    "/resignations/me",
    response_model=list[ResignationResponse],
)
def get_my_resignations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("EMPLOYEE")),
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if employee is None:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found",
        )

    return db.query(Resignation).filter(
        Resignation.employee_id == employee.id
    ).order_by(
        Resignation.created_at.desc(),
        Resignation.id.desc(),
    ).all()


# HR / ADMIN: View all resignation requests
@app.get(
    "/resignations",
    response_model=list[ResignationResponse],
)
def get_all_resignations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    return db.query(Resignation).order_by(
        Resignation.created_at.desc(),
        Resignation.id.desc(),
    ).all()


# HR / ADMIN: Approve or reject a resignation
@app.patch(
    "/resignations/{resignation_id}/decision",
    response_model=ResignationResponse,
)
def decide_resignation(
    resignation_id: int,
    data: ResignationDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN")),
):
    resignation = db.query(Resignation).filter(
        Resignation.id == resignation_id
    ).first()

    if resignation is None:
        raise HTTPException(
            status_code=404,
            detail="Resignation request not found",
        )

    if resignation.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="This resignation request has already been reviewed",
        )

    resignation.status = data.status

    db.commit()
    db.refresh(resignation)

    return resignation

# MODULE 23: INTERNAL ANNOUNCEMENTS SYSTEM


@app.post(
    "/announcements",
    response_model=AnnouncementResponse,
    status_code=201,
)
def create_announcement(
    announcement_data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("HR", "ADMIN")
    ),
):
    title = announcement_data.title.strip()
    message = announcement_data.message.strip()

    if not title or not message:
        raise HTTPException(
            status_code=422,
            detail="Title and message cannot be empty.",
        )

    announcement = Announcement(
        title=title,
        message=message,
        created_by=current_user.id,
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    return announcement


@app.get(
    "/announcements",
    response_model=list[AnnouncementResponse],
)
def get_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcements = (
        db.query(Announcement)
        .order_by(Announcement.created_at.desc())
        .all()
    )

    return announcements


@app.get(
    "/announcements/{announcement_id}",
    response_model=AnnouncementResponse,
)
def get_announcement_detail(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    announcement = (
        db.query(Announcement)
        .filter(Announcement.id == announcement_id)
        .first()
    )

    if announcement is None:
        raise HTTPException(
            status_code=404,
            detail="Announcement not found.",
        )

    return announcement



# MODULE 24: CREATE AND ASSIGN A TASK
@app.post(
    "/tasks",
    response_model=TaskResponse,
    status_code=201
)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("HR", "ADMIN"))
):
    employee = db.query(Employee).filter(
        Employee.id == task_data.assigned_to
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    task = Task(
        assigned_to=task_data.assigned_to,
        title=task_data.title.strip(),
        description=task_data.description.strip(),
        due_date=task_data.due_date,
        status="PENDING"
    )

    if not task.title or not task.description:
        raise HTTPException(
            status_code=422,
            detail="Title and description cannot be blank"
        )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


# MODULE 24: VIEW TASKS
@app.get("/tasks", response_model=List[TaskResponse])
def get_tasks(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role in ["ADMIN", "HR"]:
        return db.query(Task).order_by(Task.due_date.asc()).all()

    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    return db.query(Task).filter(
        Task.assigned_to == employee.id
    ).order_by(Task.due_date.asc()).all()


# MODULE 24: UPDATE TASK STATUS
@app.patch(
    "/tasks/{task_id}/status",
    response_model=TaskResponse
)
def update_task_status(
    task_id: int,
    status_data: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = db.query(Task).filter(
        Task.id == task_id
    ).first()

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    # HR/Admin can update any task.
    # Employees can update only their own tasks.
    if current_user.role not in ["ADMIN", "HR"]:
        employee = db.query(Employee).filter(
            Employee.user_id == current_user.id
        ).first()

        if not employee or task.assigned_to != employee.id:
            raise HTTPException(
                status_code=403,
                detail="You cannot update this task"
            )

    task.status = status_data.status

    db.commit()
    db.refresh(task)

    return task


# MODULE 25: TEST EMAIL INTEGRATION

@app.post("/integrations/email/test")
def test_email_integration(
    data: EmailTestRequest,
    current_user=Depends(require_role("HR", "ADMIN"))
):
    try:
        send_email(
            to_email=data.email,
            subject="WorkSphere HRMS - Email Integration Test",
            body=(
                "Hello,\n\n"
                "This is a test email from WorkSphere HRMS.\n"
                "Your email integration is working.\n\n"
                "Regards,\nWorkSphere HRMS"
            )
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail=(
                "Email could not be sent. Check SMTP configuration "
                "in your backend .env file."
            )
        )

    return {"message": "Test email sent successfully."}


# MODULE 25: EXPORT EMPLOYEE REPORT AS CSV

@app.get("/reports/employees.csv")
def export_employees_csv(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("HR", "ADMIN"))
):
    employees = db.query(Employee).order_by(Employee.id).all()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Employee ID",
        "Full Name",
        "Designation",
        "Department",
        "Status",
        "Joining Date",
        "Salary"
    ])

    for employee in employees:
        writer.writerow([
            employee.id,
            getattr(employee, "full_name", ""),
            getattr(employee, "designation", ""),
            getattr(employee, "department", ""),
            getattr(employee, "status", ""),
            str(getattr(employee, "joining_date", "") or ""),
            str(getattr(employee, "salary", "") or "")
        ])

    return Response(
        content="\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition":
                'attachment; filename="worksphere_employees.csv"'
        }
    )


# MODULE 25: EXPORT EMPLOYEE REPORT AS PDF

@app.get("/reports/employees.pdf")
def export_employees_pdf(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("HR", "ADMIN"))
):
    employees = db.query(Employee).order_by(Employee.id).all()

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=24,
        leftMargin=24,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    elements = [
        Paragraph("WorkSphere HRMS - Employee Report", styles["Title"])
    ]

    rows = [[
        "ID", "Full Name", "Designation", "Department",
        "Status", "Joining Date", "Salary"
    ]]

    for employee in employees:
        rows.append([
            str(employee.id),
            str(getattr(employee, "full_name", "") or ""),
            str(getattr(employee, "designation", "") or ""),
            str(getattr(employee, "department", "") or ""),
            str(getattr(employee, "status", "") or ""),
            str(getattr(employee, "joining_date", "") or ""),
            str(getattr(employee, "salary", "") or "")
        ])

    table = Table(
        rows,
        repeatRows=1,
        colWidths=[35, 115, 100, 95, 65, 85, 70]
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
            colors.white, colors.HexColor("#eff6ff")
        ]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))

    elements.append(table)
    document.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                'attachment; filename="worksphere_employees.pdf"'
        }
    )


# MODULE 25: EXPORT TASKS TO CALENDAR

def escape_ics(value):
    return (
        str(value or "")
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


@app.get("/integrations/calendar/ics")
def export_tasks_calendar(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role in ["ADMIN", "HR"]:
        tasks = db.query(Task).order_by(Task.due_date).all()
    else:
        employee = db.query(Employee).filter(
            Employee.user_id == current_user.id
        ).first()

        if not employee:
            raise HTTPException(
                status_code=404,
                detail="Employee profile not found"
            )

        tasks = db.query(Task).filter(
            Task.assigned_to == employee.id
        ).order_by(Task.due_date).all()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//WorkSphere HRMS//Task Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]

    for task in tasks:
        due = task.due_date
        if isinstance(due, datetime):
            due = due.date()

        if not isinstance(due, date):
            continue

        start_date = due.strftime("%Y%m%d")
        end_date = (due + timedelta(days=1)).strftime("%Y%m%d")

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:worksphere-task-{task.id}@hrms",
            f"DTSTAMP:{timestamp}",
            f"DTSTART;VALUE=DATE:{start_date}",
            f"DTEND;VALUE=DATE:{end_date}",
            f"SUMMARY:{escape_ics(task.title)}",
            f"DESCRIPTION:{escape_ics(task.description)}",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    calendar_content = "\r\n".join(lines) + "\r\n"

    return Response(
        content=calendar_content,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition":
                'attachment; filename="worksphere_tasks.ics"'
        }
    )



@app.post(
    "/feedback",
    response_model=FeedbackResponse,
    status_code=201
)
def submit_feedback(
    feedback_data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("EMPLOYEE"))
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee profile not found"
        )

    feedback = Feedback(
        employee_id=employee.id,
        message=feedback_data.message.strip(),
        rating=feedback_data.rating
    )

    if not feedback.message:
        raise HTTPException(
            status_code=422,
            detail="Feedback message cannot be empty"
        )

    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return feedback


@app.get(
    "/feedback",
    response_model=List[FeedbackResponse]
)
def get_all_feedback(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("HR", "ADMIN"))
):
    feedback_list = (
        db.query(Feedback)
        .order_by(Feedback.created_at.desc())
        .all()
    )

    return feedback_list



# ==========================================================
# MODULE 27: PROFILE & SETTINGS MANAGEMENT
# ==========================================================

from sqlalchemy.exc import IntegrityError


# VIEW OWN PROFILE
@app.get("/profile", response_model=ProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "full_name": employee.full_name if employee else None,
        "designation": employee.designation if employee else None,
        "department": employee.department if employee else None,
    }


# UPDATE OWN PROFILE
@app.patch("/profile", response_model=ProfileResponse)
def update_my_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    updates = profile_data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one field to update"
        )

    if all(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Profile fields cannot all be null"
        )

    if "username" in updates and updates["username"] is not None:
        updates["username"] = updates["username"].strip()

        if len(updates["username"]) < 3:
            raise HTTPException(
                status_code=422,
                detail="Username must contain at least 3 characters"
            )

        existing_user = db.query(User).filter(
            User.username == updates["username"],
            User.id != current_user.id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Username is already in use"
            )

    if "email" in updates and updates["email"] is not None:
        existing_user = db.query(User).filter(
            User.email == str(updates["email"]),
            User.id != current_user.id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Email is already in use"
            )

    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    full_name = updates.pop("full_name", None)
    update_full_name = "full_name" in profile_data.model_fields_set

    try:
        for field, value in updates.items():
            setattr(current_user, field, value)

        if update_full_name:
            if not employee:
                raise HTTPException(
                    status_code=404,
                    detail="Employee profile not found"
                )

            if full_name is None:
                raise HTTPException(
                    status_code=422,
                    detail="Full name cannot be null"
                )

            employee.full_name = full_name.strip()

        db.commit()
        db.refresh(current_user)

        if employee:
            db.refresh(employee)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Username or email is already in use"
        )

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "full_name": employee.full_name if employee else None,
        "designation": employee.designation if employee else None,
        "department": employee.department if employee else None,
    }


# GET NOTIFICATION PREFERENCES
@app.get(
    "/settings/notifications",
    response_model=NotificationPreferenceResponse
)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()

    if not preferences:
        preferences = NotificationPreference(
            user_id=current_user.id
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)

    return preferences


# UPDATE NOTIFICATION PREFERENCES
@app.put(
    "/settings/notifications",
    response_model=NotificationPreferenceResponse
)
def update_notification_preferences(
    preference_data: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    preferences = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()

    if not preferences:
        preferences = NotificationPreference(
            user_id=current_user.id
        )
        db.add(preferences)
        db.flush()

    updates = preference_data.model_dump()

    for field, value in updates.items():
        setattr(preferences, field, value)

    db.commit()
    db.refresh(preferences)

    return preferences


# CHANGE PASSWORD
@app.post("/profile/change-password")
def change_my_password(
    password_data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Step 1: Verify the current password
    if not verify_password(
        password_data.current_password,
        current_user.hashed_password
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    # Step 2: Prevent using the same password again
    if verify_password(
        password_data.new_password,
        current_user.hashed_password
    ):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the current password"
        )

    # Step 3: Hash the new password
    current_user.hashed_password = hash_password(
        password_data.new_password
    )

    # Step 4: Save the updated password
    db.commit()

    return {
        "message": "Password changed successfully. Please log in again."
    }
