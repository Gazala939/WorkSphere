
from typing import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import SECRET_KEY, ALGORITHM

bearer_scheme = HTTPBearer()

VALID_ROLES = {"EMPLOYEE", "HR", "ADMIN"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload.get("sub", 0))
        token_role = payload.get("role")

        if user_id <= 0:
            raise ValueError("Invalid user ID")

        if token_role not in VALID_ROLES:
            raise ValueError("Invalid role in token")

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Reject deactivated accounts, even if the user has an old JWT token.
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact the administrator."
        )


    # Database role must match the role in the JWT.
    # If an administrator changes the role, the old token
    # must be replaced by logging in again.
    if user.role not in VALID_ROLES or user.role != token_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User role changed or is invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


def require_role(*allowed_roles: str) -> Callable:

    invalid_roles = set(allowed_roles) - VALID_ROLES

    if invalid_roles:
        raise ValueError(
            f"Invalid role configuration: {invalid_roles}"
        )

    def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )

        return current_user

    return role_checker
