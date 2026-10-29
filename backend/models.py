
from datetime import datetime, timezone, date

from sqlalchemy import(
    Column, 
    Integer, 
    String,
    Text,
    DateTime,
    Date,
    Float,
    Time,
    ForeignKey,
    Boolean,
    UniqueConstraint
)
from database import Base

# USER

# USER
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    role = Column(String(20), default="EMPLOYEE", nullable=False)

    # Admin can activate or deactivate a user account
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

#  EMPLOYEE
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
        index=True,
    )

    full_name = Column(String(100), nullable=False)
    designation = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    joining_date = Column(Date, nullable=False)
    salary = Column(Float, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="ACTIVE")

#  ATTENDANCE MANAGEMENT
class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    check_in = Column(DateTime(timezone=True), nullable=True)

    check_out = Column(DateTime(timezone=True), nullable=True)

    date = Column(Date, nullable=False, default=date.today)

    status = Column(
        String(20),
        nullable=False,
        default="ABSENT"
    )
  
# SHIFTS  
class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    
class EmployeeShift(Base):
    __tablename__ = "employee_shifts"

    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            name="uq_employee_current_shift",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )

    shift_id = Column(
        Integer,
        ForeignKey("shifts.id"),
        nullable=False,
        index=True,
    )
    

# LEAVE MANAGEMENT
class Leave(Base):
    __tablename__ = "leaves"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    leave_type = Column(
        String(20),
        nullable=False
    )  # SICK / CASUAL / PAID

    start_date = Column(Date, nullable=False)

    end_date = Column(Date, nullable=False)

    reason = Column(String(500), nullable=False)

    status = Column(
        String(20),
        nullable=False,
        default="PENDING"
    )  # PENDING / APPROVED / REJECTED
    


# LEAVE POLICY
class LeavePolicy(Base):
    __tablename__ = "leave_policies"

    id = Column(Integer, primary_key=True, index=True)

    leave_type = Column(String(20), nullable=False, unique=True)

    total_days_allowed = Column(Integer, nullable=False, default=0)


# EMPLOYEE LEAVE BALANCE
class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    leave_type = Column(String(20), nullable=False)

    remaining_days = Column(Integer, nullable=False, default=0)



# ==========================================================
# MODULE 5: PAYROLL MANAGEMENT
# ==========================================================

class Payroll(Base):
    __tablename__ = "payrolls"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    basic_salary = Column(Float, nullable=False)
    allowances = Column(Float, nullable=False, default=0)
    deductions = Column(Float, nullable=False, default=0)
    bonus = Column(Float, nullable=False, default=0)
    net_salary = Column(Float, nullable=False)

    # Format: YYYY-MM, for example 2026-10
    month = Column(String(7), nullable=False)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

# ==========================================================
# MODULE 7: NOTIFICATIONS SYSTEM
# ==========================================================

class Notification(Base):
    __tablename__ = "notifications"

    # Unique notification ID
    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # User who receives this notification
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Notification heading
    title = Column(
        String(150),
        nullable=False
    )

    # Notification details
    message = Column(
        String(500),
        nullable=False
    )

    # False = unread, True = read
    is_read = Column(
        Boolean,
        default=False,
        nullable=False
    )

    # Notification creation time
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    

# MODULE 16: DOCUMENT MANAGEMENT

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    file_name = Column(String(255), nullable=False)

    file_url = Column(String(500), nullable=False)

    uploaded_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )



# ==========================================================
# MODULE 17: PERFORMANCE MANAGEMENT
# ==========================================================

class Performance(Base):
    __tablename__ = "performances"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    review_period = Column(
        String(50),
        nullable=False
    )

    rating = Column(
        Float,
        nullable=False
    )

    feedback = Column(
        String(1000),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )


# ==========================================================
# MODULE 17: PERFORMANCE MANAGEMENT
# ==========================================================

class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    review_period = Column(String(50), nullable=False)

    rating = Column(Float, nullable=False)

    feedback = Column(String(1000), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )



# ==========================================================
# MODULE 21: EMPLOYEE ONBOARDING SYSTEM
# ==========================================================

class Onboarding(Base):
    __tablename__ = "onboarding"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    task_name = Column(
        String(200),
        nullable=False
    )

    status = Column(
        String(20),
        nullable=False,
        default="PENDING"
    )  # PENDING / COMPLETED

    due_date = Column(
        Date,
        nullable=False
    )


# ==========================================================
# MODULE 22: RESIGNATION & EXIT MANAGEMENT
# ==========================================================

class Resignation(Base):
    __tablename__ = "resignations"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )

    reason = Column(Text, nullable=False)

    notice_period = Column(Integer, nullable=False)

    status = Column(
        String,
        default="PENDING",
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    assigned_to = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    due_date = Column(Date, nullable=False)

    status = Column(
        String(20),
        default="PENDING",
        nullable=False
    )

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )
    message = Column(Text, nullable=False)
    rating = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ==========================================================
# MODULE 27: NOTIFICATION PREFERENCES
# ==========================================================

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
        index=True
    )

    attendance_alerts = Column(
        Boolean,
        default=True,
        nullable=False
    )

    leave_updates = Column(
        Boolean,
        default=True,
        nullable=False
    )

    announcements = Column(
        Boolean,
        default=True,
        nullable=False
    )

    task_updates = Column(
        Boolean,
        default=True,
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
