
from datetime import datetime,date,time
from typing import Literal, Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field,StringConstraints


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)



class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    role: Literal["EMPLOYEE", "HR", "ADMIN"]
    is_active: bool
    created_at: datetime



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleUpdateRequest(BaseModel):
    role: Literal["EMPLOYEE", "HR", "ADMIN"]
class AdminUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["EMPLOYEE", "HR", "ADMIN"] = "EMPLOYEE"


class AdminUserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    email: EmailStr | None = None
    role: Literal["EMPLOYEE", "HR", "ADMIN"] | None = None
    is_active: bool | None = None


class UserStatusUpdate(BaseModel):
    is_active: bool

# Employee:

class EmployeeCreate(BaseModel):
    user_id: int = Field(gt=0)
    full_name: str = Field(min_length=2, max_length=100)
    designation: str = Field(min_length=2, max_length=100)
    department: str = Field(min_length=2, max_length=100)
    joining_date: date
    salary: float = Field(ge=0)
    status: Literal["ACTIVE", "INACTIVE"] = "ACTIVE"
    
class EmployeeWithUserCreate(BaseModel):
    # Login account details
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    # Employee details
    full_name: str = Field(min_length=2, max_length=100)
    designation: str = Field(min_length=2, max_length=100)
    department: str = Field(min_length=2, max_length=100)
    joining_date: date
    salary: float = Field(ge=0)
    status: Literal["ACTIVE", "INACTIVE"] = "ACTIVE"


class EmployeeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    designation: str | None = Field(default=None, min_length=2, max_length=100)
    department: str | None = Field(default=None, min_length=2, max_length=100)
    joining_date: date | None = None
    salary: float | None = Field(default=None, ge=0)
    status: Literal["ACTIVE", "INACTIVE"] | None = None


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    full_name: str
    designation: str
    department: str
    joining_date: date
    salary: float
    status: Literal["ACTIVE", "INACTIVE"]
    
    

#  ATTENDANCE MANAGEMENT
class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    check_in: datetime | None
    check_out: datetime | None
    date: date
    status: Literal["PRESENT", "ABSENT", "HALF_DAY"]
    working_hours: float | None = None
    is_late: bool = False
    overtime_hours: float | None = None
    
    # Phase 3 - Shift Management
    shift_name: str | None = None
    late_minutes: int = 0
    is_early_checkout: bool = False
    early_checkout_minutes: int = 0



# LEAVE MANAGEMENT

class LeaveCreate(BaseModel):
    leave_type: Literal["SICK", "CASUAL", "PAID"]
    start_date: date
    end_date: date
    reason: str = Field(min_length=3, max_length=500)


class LeaveDecision(BaseModel):
    status: Literal["APPROVED", "REJECTED"]


class LeaveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    leave_type: Literal["SICK", "CASUAL", "PAID"]
    start_date: date
    end_date: date
    reason: str
    status: Literal["PENDING", "APPROVED", "REJECTED"]


# ==========================================================
# MODULE 5: PAYROLL MANAGEMENT SCHEMAS
# ==========================================================


MonthType = Annotated[
    str,
    StringConstraints(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
]


class PayrollCreate(BaseModel):
    employee_id: int = Field(gt=0)
    basic_salary: float = Field(ge=0)
    allowances: float = Field(default=0, ge=0)
    deductions: float = Field(default=0, ge=0)
    bonus: float = Field(default=0, ge=0)
    month: MonthType


class PayrollResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    basic_salary: float
    allowances: float
    deductions: float
    bonus: float
    net_salary: float
    month: str
    created_at: datetime


# LEAVE POLICY SCHEMAS

class LeavePolicyCreate(BaseModel):
    leave_type: str
    total_days_allowed: int = Field(ge=0)


class LeavePolicyResponse(BaseModel):
    id: int
    leave_type: str
    total_days_allowed: int

    model_config = ConfigDict(from_attributes=True)


# LEAVE BALANCE SCHEMAS

class LeaveBalanceCreate(BaseModel):
    employee_id: int
    leave_type: str
    remaining_days: int = Field(ge=0)


class LeaveBalanceResponse(BaseModel):
    id: int
    employee_id: int
    leave_type: str
    remaining_days: int

    model_config = ConfigDict(from_attributes=True)


class ShiftCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    start_time: time
    end_time: time


class ShiftResponse(BaseModel):
    id: int
    name: str
    start_time: time
    end_time: time

    model_config = ConfigDict(from_attributes=True)


class EmployeeShiftCreate(BaseModel):
    employee_id: int = Field(gt=0)
    shift_id: int = Field(gt=0)


class EmployeeShiftResponse(BaseModel):
    id: int
    employee_id: int
    shift_id: int

    model_config = ConfigDict(from_attributes=True)
    
    
class LeaveCalendarItem(BaseModel):
    leave_id: int
    employee_id: int
    employee_name: str
    department: str
    leave_type: str
    start_date: date
    end_date: date
    status: str

    model_config = ConfigDict(from_attributes=True)


class TeamAvailabilityItem(BaseModel):
    employee_id: int
    employee_name: str
    department: str
    availability: str
    leave_type: str | None = None
    leave_start_date: date | None = None
    leave_end_date: date | None = None
    

# MODULE 16: DOCUMENT MANAGEMENT

class DocumentResponse(BaseModel):
    id: int
    employee_id: int
    file_name: str
    file_url: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================================
# MODULE 17: PERFORMANCE MANAGEMENT SCHEMAS
# ==========================================================



class PerformanceCreate(BaseModel):
    employee_id: int = Field(gt=0)
    review_period: str = Field(min_length=1, max_length=50)
    rating: float = Field(ge=1, le=5)
    feedback: str = Field(min_length=1, max_length=1000)


class PerformanceResponse(BaseModel):
    id: int
    employee_id: int
    review_period: str
    rating: float
    feedback: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PerformanceReviewCreate(BaseModel):
    employee_id: int
    review_period: str = Field(min_length=1, max_length=50)
    rating: float = Field(ge=1, le=5)
    feedback: str = Field(min_length=1, max_length=1000)
    
class PerformanceReviewResponse(BaseModel):
    id: int
    employee_id: int
    review_period: str
    rating: float
    feedback: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
