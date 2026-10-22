
import sqlite3
import shutil
from pathlib import Path

db_path = Path(__file__).resolve().parent / "worksphere.db"

if not db_path.exists():
    raise FileNotFoundError(
        f"Database not found: {db_path}"
    )

# Keep a backup before changing the database.
backup_path = db_path.with_name("worksphere_before_allowances.db")
shutil.copy2(db_path, backup_path)

connection = sqlite3.connect(db_path)

try:
    columns = connection.execute(
        "PRAGMA table_info(payrolls)"
    ).fetchall()

    if not columns:
        raise RuntimeError(
            "The payrolls table was not found. No changes made."
        )

    column_names = [column[1] for column in columns]

    if "allowances" not in column_names:
        connection.execute(
            "ALTER TABLE payrolls "
            "ADD COLUMN allowances FLOAT NOT NULL DEFAULT 0"
        )
        connection.commit()
        print("Allowances column added successfully.")
    else:
        print("Allowances column already exists.")

    updated_columns = connection.execute(
        "PRAGMA table_info(payrolls)"
    ).fetchall()

    print("Payroll columns:", [column[1] for column in updated_columns])
    print("Backup saved to:", backup_path)

finally:
    connection.close()
