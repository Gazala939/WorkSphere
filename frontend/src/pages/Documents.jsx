
import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import "../styles/Documents.css";

export default function Documents() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isEmployee = user?.role === "EMPLOYEE";
  const canManageDocuments =
    user?.role === "HR" || user?.role === "ADMIN";

  // Load documents for the selected employee or logged-in employee.
  const loadDocuments = async (employeeId = selectedEmployeeId) => {
    if (canManageDocuments && !employeeId) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let response;

      if (isEmployee) {
        response = await api.get("/documents");
      } else {
        response = await api.get("/documents", {
          params: { employee_id: employeeId },
        });
      }

      setDocuments(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load documents."
      );
    } finally {
      setLoading(false);
    }
  };

  // Load employees for HR/Admin; load own documents for employees.
  useEffect(() => {
    const initializePage = async () => {
      setError("");

      if (canManageDocuments) {
        try {
          const response = await api.get("/employees");
          setEmployees(response.data);
        } catch (err) {
          setError(
            err.response?.data?.detail ||
              "Unable to load employees."
          );
        }
      } else if (isEmployee) {
        await loadDocuments();
      }
    };

    initializePage();
  }, [user?.role]);

  const handleEmployeeChange = async (event) => {
    const employeeId = event.target.value;

    setSelectedEmployeeId(employeeId);
    setDocuments([]);
    setMessage("");
    setError("");

    if (employeeId) {
      await loadDocuments(employeeId);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!file) {
      setError("Please select a document first.");
      return;
    }

    if (canManageDocuments && !selectedEmployeeId) {
      setError("Please select an employee first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    try {
      // HR/Admin send employee_id with the upload request.
      const config = canManageDocuments
        ? { params: { employee_id: selectedEmployeeId } }
        : {};

      await api.post("/documents/upload", formData, config);

      setMessage("Document uploaded successfully!");
      setFile(null);
      event.target.reset();

      await loadDocuments();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document) => {
    setError("");

    try {
      const response = await api.get(
        `/documents/${document.id}/download`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.file_name;

      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to download this document."
      );
    }
  };

  return (
    <div className="documents-page">
      <div className="documents-header">
        <div>
          <h1>Document Management</h1>
          <p>
            Upload, view, and download your documents securely.
          </p>
        </div>

        <button
          type="button"
          className="documents-refresh"
          onClick={() => loadDocuments()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {canManageDocuments && (
        <section className="document-upload-card">
          <div className="employee-selector">
            <label htmlFor="employee-select">
              Select Employee
            </label>

            <select
              id="employee-select"
              value={selectedEmployeeId}
              onChange={handleEmployeeChange}
            >
              <option value="">
                -- Select an employee --
              </option>

              {employees.map((employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.full_name} (ID: {employee.id})
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      <section className="document-upload-card">
        <h2>Upload Document</h2>

        <p className="document-help">
          Supported formats: PDF, PNG, JPG, DOC, DOCX.
          Maximum size: 10 MB.
        </p>

        <form onSubmit={handleUpload}>
          <label htmlFor="document-file">
            Choose a file
          </label>

          <input
            id="document-file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={(event) =>
              setFile(event.target.files?.[0] || null)
            }
            required
          />

          {file && (
            <p className="selected-document">
              Selected: {file.name}
            </p>
          )}

          <button
            type="submit"
            className="document-upload-button"
            disabled={
              uploading ||
              (canManageDocuments && !selectedEmployeeId)
            }
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </section>

      {message && (
        <div className="document-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="document-error" role="alert">
          {error}
        </div>
      )}

      <section className="document-list-card">
        <h2>
          {isEmployee ? "My Documents" : "Employee Documents"}
        </h2>

        {canManageDocuments && !selectedEmployeeId ? (
          <p className="document-empty">
            Select an employee to view their documents.
          </p>
        ) : loading ? (
          <p>Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="document-empty">
            No documents uploaded yet.
          </p>
        ) : (
          <div className="document-table-wrapper">
            <table className="document-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {canManageDocuments && <th>Employee ID</th>}
                  <th>File Name</th>
                  <th>Uploaded At</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>{document.id}</td>

                    {canManageDocuments && (
                      <td>{document.employee_id}</td>
                    )}

                    <td>{document.file_name}</td>

                    <td>
                      {new Date(
                        document.uploaded_at
                      ).toLocaleString()}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="document-download-button"
                        onClick={() =>
                          handleDownload(document)
                        }
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
