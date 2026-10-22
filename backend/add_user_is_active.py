
from sqlalchemy import inspect, text
from database import engine

inspector = inspect(engine)

columns = [
    column["name"]
    for column in inspector.get_columns("users")
]

if "is_active" not in columns:
    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"
            )
        )
    print("SUCCESS: is_active column added to users table.")
else:
    print("INFO: is_active column already exists.")

# Verify the column
inspector = inspect(engine)
columns = [
    column["name"]
    for column in inspector.get_columns("users")
]

print("Current users table columns:", columns)
