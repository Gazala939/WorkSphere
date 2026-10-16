
from datetime import datetime, timezone, date

from sqlalchemy import(
    Column, 
    Integer, 
    String,
    DateTime,
    Date,
    Float,
    Time,
    ForeignKey,
    Boolean
)
from database import Base

# USER
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="EMPLOYEE", nullable=False)
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