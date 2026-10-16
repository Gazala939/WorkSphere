
from datetime import datetime,date,time
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleUpdateRequest(BaseModel):
    role: Literal["EMPLOYEE", "HR", "ADMIN"]


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

from datetime import date
from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, StringConstraints


MonthType = Annotated[
    str,
    StringConstraints(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
]


class PayrollCreate(BaseModel):
    employee_id: int = Field(gt=0)
    basic_salary: float = Field(ge=0)
    deductions: float = Field(default=0, ge=0)
    bonus: float = Field(default=0, ge=0)
    month: MonthType


class PayrollResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    basic_salary: float
    deductions: float
    bonus: float
    net_salary: float
    month: str
    created_at: datetime
