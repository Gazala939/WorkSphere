WorkSphere HRMS

WorkSphere HRMS is a Human Resource Management System built with
FastAPI, React, and SQLAlchemy. It helps employees, HR
staff, and administrators manage employee records, attendance, leave
requests, payroll, notifications, analytics, and user access.


Table of Contents
- Features
- Technology Stack
- Project Structure
- Prerequisites
- Setup and Installation
- Environment Configuration
- Running the Application
- API Documentation
- User Roles and Permissions
- Main Modules
- Testing Checklist
- Security Notes
- Troubleshooting


Features
- User registration and login with JWT authentication
- Role-based access control for EMPLOYEE, HR, and ADMIN
- Employee profile and employee-record management
- Employee self-service dashboard
- Attendance check-in/check-out and attendance history
- Attendance validations and status tracking
- Leave requests, approvals, and leave-balance management
- Payroll records and salary information
- Notifications
- HR/Admin dashboards and analytics
- Admin user management: create, edit, assign roles,
  activate/deactivate, and delete eligible accounts
Features available in the running application depend on the code and
configuration in the local project. Optional features such as overtime
calculation should be treated as implemented only if present and
tested in the codebase.

Technology Stack
Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- SQLite (current development database; configuration may vary)
- JWT-based authentication and password hashing

Frontend
- React
- React Router
- Axios
- Vite
- CSS


Prerequisites
Install the following before running the project:
- Python 3.10 or newer (use the version supported by your installed
  dependencies)
- Node.js and npm
- A terminal such as PowerShell on Windows

Setup and Installation
1. Open the backend folder
In Windows PowerShell:
cd C:\WorkSphere\backend

2. Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1
If PowerShell blocks script activation, use a terminal configured to
allow activation or run the environment's Python executable directly.

3. Install backend dependencies
If the project contains requirements.txt:
python -m pip install -r requirements.txt
If there is no requirements.txt, install the dependencies listed by
the project and create a requirements file for reproducible setup. Do
not install arbitrary packages without checking the imports used by the
project.

4. Configure environment variables
Create or update backend/.env using the variable names expected by
your security.py, database.py, and application configuration. See
Environment Configuration.

5. Start the backend
uvicorn main:app --reload
The backend should be available at:
- API base: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs
Run the command from the backend directory. If your application uses a
different module path, adjust the Uvicorn command to match it.

6. Start the frontend
Open a second PowerShell terminal:
cd C:\WorkSphere\frontend
npm install
npm.cmd run dev
Open the Vite URL shown in the terminal. In this project, it is
normally:

- Frontend: http://localhost:5173
The frontend API client currently uses http://127.0.0.1:8000. If your
backend runs at another address, update the API base URL or use the
environment-variable approach supported by your frontend setup.
Environment Configuration
Keep secrets in environment variables rather than hard-coding them into
source code. Your .env variable names must match what the application
reads.

Example only---replace the names with the exact settings used in your
code:

SECRET_KEY=replace_with_a_long_random_secret
DATABASE_URL=sqlite:///./worksphere.db
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

Important: - Do not commit .env files, passwords, signing keys, or
real credentials to Git. - Do not use example secret values in
production. - Check database.py and security.py before copying this
example; your project may use different variable names or defaults. - If
you use SQLite, back up the database before running migrations or
database-altering scripts.
Running the Application
1. Start the backend in the backend folder.
2. Start the frontend in the frontend folder.
3. Open http://localhost:5173.
4. Sign in using an account that already exists in your development
   database, or register an account if registration is enabled.
5. Use an account with the appropriate role to test employee, HR, and
   admin features.
API request authentication
The frontend Axios client attaches the stored JWT as a bearer token when
available:
Authorization: Bearer <your_access_token>
Do not share a real access token in screenshots, logs, or source
control.
API Documentation
With the backend running, open:

http://127.0.0.1:8000/docs


Testing Checklist
Use separate test accounts for EMPLOYEE, HR, and ADMIN. Never test
destructive actions against important production data.
- [ ] Valid login returns an access token.
- [ ] Invalid credentials are rejected.
- [ ] Deactivated users cannot log in.
- [ ] Reactivated users can log in with correct credentials.
- [ ] Employees cannot access admin-only endpoints.
- [ ] Employees can access only their own protected records.
- [ ] HR permissions work as intended.
- [ ] Admin can create users and assign permitted roles.
- [ ] Admin can edit and activate/deactivate eligible users.
- [ ] Duplicate usernames/emails are rejected.
- [ ] Attendance rules behave correctly for repeated check-ins and
  missing attendance.
- [ ] Leave approval updates balances correctly and overuse is
  prevented.
- [ ] Payroll information is restricted to authorized users.
- [ ] Frontend pages display API errors clearly.
Security Notes
- Store passwords as secure hashes; never store plain-text passwords.
- Validate roles and ownership on every protected backend endpoint.
- Validate incoming data using Pydantic schemas.
- Use a strong, private JWT signing key and an appropriate token
  expiry.
- Do not expose .env, database files, passwords, tokens, or personal
  employee data in public repositories.
- Protect destructive actions and prevent administrators from
  accidentally removing their own required access.
- Use HTTPS and a production-ready database/configuration before
  deploying publicly.
- Follow applicable privacy and employment-data requirements when
  handling real employee information
  
Troubleshooting
Backend does not start
- Confirm that the terminal is in C:\WorkSphere\backend.
- Activate the correct virtual environment.
- Install dependencies from requirements.txt, if present.
- Read the full traceback and check for missing environment variables
  or database errors.
Frontend cannot connect to the backend
- Confirm the backend is running at http://127.0.0.1:8000.
- Check the Axios baseURL in frontend/src/api.js.
- Confirm the backend CORS configuration allows
  http://localhost:5173.
Login returns 401 or 403
- 401 commonly indicates missing/invalid credentials or token.
- 403 may indicate an inactive account or insufficient permissions.
- Confirm the account's role and activation status in the database.
Database column errors
- Back up the database first.
- Ensure database migrations or required schema-update scripts have
  been run.
- Avoid deleting the database unless you intentionally want to lose
  development records.