
import sqlite3

DATABASE_PATH = r"C:\WorkSphere\backend\worksphere.db"

connection = sqlite3.connect(DATABASE_PATH)

try:
    connection.execute("BEGIN IMMEDIATE")

    # Read the existing table columns
    policy_columns = {
        row[1]
        for row in connection.execute(
            "PRAGMA table_info(leave_policies)"
        ).fetchall()
    }

    balance_columns = {
        row[1]
        for row in connection.execute(
            "PRAGMA table_info(leave_balances)"
        ).fetchall()
    }

    # Stop if the database is not in the expected old format
    if "allowed_days" not in policy_columns:
        raise RuntimeError(
            "Expected old allowed_days column was not found."
        )

    if not {"total_days", "used_days"}.issubset(balance_columns):
        raise RuntimeError(
            "Expected old total_days and used_days columns were not found."
        )

    if "total_days_allowed" in policy_columns:
        raise RuntimeError(
            "Policy migration may already have been performed."
        )

    if "remaining_days" in balance_columns:
        raise RuntimeError(
            "Balance migration may already have been performed."
        )

    # Prevent invalid leave balances
    invalid_count = connection.execute("""
        SELECT COUNT(*)
        FROM leave_balances
        WHERE total_days < 0
           OR used_days < 0
           OR used_days > total_days
    """).fetchone()[0]

    if invalid_count:
        raise RuntimeError(
            "Invalid leave balances found. Migration stopped."
        )

    # Rename the policy column to match the assignment
    connection.execute("""
        ALTER TABLE leave_policies
        RENAME COLUMN allowed_days TO total_days_allowed
    """)

    # Add the new remaining_days column
    connection.execute("""
        ALTER TABLE leave_balances
        ADD COLUMN remaining_days INTEGER NOT NULL DEFAULT 0
    """)

    # Preserve the actual remaining leave for every employee
    connection.execute("""
        UPDATE leave_balances
        SET remaining_days = total_days - used_days
    """)

    # Remove old columns after the new values are calculated
    connection.execute("""
        ALTER TABLE leave_balances DROP COLUMN total_days
    """)

    connection.execute("""
        ALTER TABLE leave_balances DROP COLUMN used_days
    """)

    # Confirm the migrated values before committing
    policies = connection.execute("""
        SELECT id, leave_type, total_days_allowed
        FROM leave_policies
        ORDER BY id
    """).fetchall()

    balances = connection.execute("""
        SELECT id, employee_id, leave_type, remaining_days
        FROM leave_balances
        ORDER BY id
    """).fetchall()

    print("Migrated policies:", policies)
    print("Migrated balances:", balances)

    connection.commit()
    print("SUCCESS: Module 11 database migration completed.")

except Exception as error:
    connection.rollback()
    print("MIGRATION FAILED:", error)
    print("Changes were rolled back.")

finally:
    connection.close()
