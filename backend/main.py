
from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import FastAPI, Depends, HTTPException, status,Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from sqlalchemy.exc import IntegrityError

from apscheduler.schedulers.background import BackgroundScheduler

from database import Base,SessionLocal, engine, get_db
from models import (
    User,
    Employee,
    Attendance,
    Leave,
    Payroll,
    Notification,
    LeavePolicy,
    LeaveBalance,
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
)
from security import (
    hash_password,
    verify_password,
    create_access_token
)
from dependencies import get_current_user, require_role

INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


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
        run_daily_absence_check,
        trigger="cron",
        day_of_week="mon-fri",
        hour=18,
        minute=45,
        id="daily_absence_check",
        replace_existing=True,
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

@app.post(
    "/employees",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    # Check whether the linked user exists
    linked_user = db.query(User).filter(
        User.id == data.user_id
    ).first()

    if not linked_user:
        raise HTTPException(
            status_code=404,
            detail="Linked user not found"
        )

    # One employee profile per user
    existing_employee = db.query(Employee).filter(
        Employee.user_id == data.user_id
    ).first()

    if existing_employee:
        raise HTTPException(
            status_code=409,
            detail="Employee profile already exists for this user"
        )

    employee_data = data.model_dump()
    employee_data["full_name"] = employee_data["full_name"].strip()
    employee_data["designation"] = employee_data["designation"].strip()
    employee_data["department"] = employee_data["department"].strip()

    if not all([
        employee_data["full_name"],
        employee_data["designation"],
        employee_data["department"]
    ]):
        raise HTTPException(
            status_code=422,
            detail="Employee text fields cannot be empty"
        )

    employee = Employee(**employee_data)

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return employee

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
    "/employees",
    response_model=list[EmployeeResponse]
)
def list_employees(
    search: str | None = Query(default=None, min_length=1, max_length=100),
    department: str | None = Query(default=None, min_length=1, max_length=100),
    employee_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(ACTIVE|INACTIVE)$"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR", "ADMIN"))
):
    query = db.query(Employee)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(search_term),
                Employee.designation.ilike(search_term)
            )
        )

    if department:
        query = query.filter(
            Employee.department.ilike(department.strip())
        )

    if employee_status:
        query = query.filter(Employee.status == employee_status)

    return query.order_by(Employee.id.desc()).all()


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


def build_attendance_response(attendance: Attendance):
    """Calculate working hours for an attendance record."""

    working_hours = None

    if attendance.check_in and attendance.check_out:
        check_in_time = make_utc_aware(attendance.check_in)
        check_out_time = make_utc_aware(attendance.check_out)

        duration = check_out_time - check_in_time
        working_hours = round(duration.total_seconds() / 3600, 2)
        
    
    is_late = False
    overtime_hours = None

    if attendance.check_in and attendance.check_out:
        overtime_hours = round(max(working_hours - 8, 0), 2)
    

    if attendance.check_in:
        check_in_utc = make_utc_aware(attendance.check_in)
        check_in_india = check_in_utc.astimezone(INDIA_TIMEZONE)

        official_check_in = time(9, 30)

        is_late = check_in_india.time().replace(
            tzinfo=None
        ) > official_check_in


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
    }



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

    today = datetime.now(INDIA_TIMEZONE).date()

    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.date == today,
    ).first()

    if attendance and attendance.check_in:
        raise HTTPException(
            status_code=409,
            detail="You have already checked in today",
        )

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

    # Create notification for BOTH new and existing records
    create_notification(
        db=db,
        user_id=current_user.id,
        title="Attendance Check-In",
        message=f"Your attendance check-in was recorded for {today}.",
    )

    db.commit()
    db.refresh(attendance)

    return build_attendance_response(attendance)


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

    today = datetime.now(INDIA_TIMEZONE).date()

    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.date == today,
    ).first()

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
            f"Your check-out was recorded for {today}. "
            f"Working hours: {round(hours, 2)}. "
            f"Attendance status: {attendance.status}."
        ),
    )

    db.commit()
    db.refresh(attendance)

    return build_attendance_response(attendance)


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
        build_attendance_response(record)
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
        build_attendance_response(record)
        for record in records
    ]


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