
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import User
from schemas import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    TokenResponse,
    RoleUpdateRequest
)
from security import (
    hash_password,
    verify_password,
    create_access_token
)
from dependencies import get_current_user, require_role


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


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

    if not user or not verify_password(
        data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

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
