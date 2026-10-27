
from database import SessionLocal
from models import Employee, LeaveBalance

db = SessionLocal()

try:
    employee_id = 2
    leave_type = "PAID"
    initial_days = 12

    # Check whether the employee exists
    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        print(f"Employee ID {employee_id} does not exist.")
    else:
        # Check whether the balance already exists
        balance = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == employee_id,
            LeaveBalance.leave_type == leave_type
        ).first()

        if balance:
            print(
                f"Existing balance: {balance.remaining_days} "
                f"{leave_type} days."
            )
            print("No changes made.")
        else:
            balance = LeaveBalance(
                employee_id=employee_id,
                leave_type=leave_type,
                remaining_days=initial_days
            )

            db.add(balance)
            db.commit()

            print(
                f"Created {leave_type} balance for Employee "
                f"{employee_id}: {initial_days} days."
            )

except Exception:
    db.rollback()
    raise

finally:
    db.close()
