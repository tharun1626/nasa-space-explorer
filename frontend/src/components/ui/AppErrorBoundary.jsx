import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "", stack: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown runtime error" };
  }

  componentDidCatch(error, info) {
    this.setState({ stack: info?.componentStack || "" });
    console.error("App runtime crash:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        background: "#050b16",
        color: "#e9f4ff",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Frontend Runtime Error</h1>
        <p style={{ opacity: 0.9, marginBottom: "0.75rem" }}>
          The app crashed while rendering. This is why you were seeing a blank page.
        </p>
        <pre style={{
          whiteSpace: "pre-wrap",
          background: "#0b1528",
          border: "1px solid #2d4264",
          borderRadius: "10px",
          padding: "0.9rem",
          marginBottom: "0.75rem",
        }}>
          {this.state.message}
        </pre>
        {this.state.stack ? (
          <pre style={{
            whiteSpace: "pre-wrap",
            background: "#0b1528",
            border: "1px solid #2d4264",
            borderRadius: "10px",
            padding: "0.9rem",
            maxHeight: "45vh",
            overflow: "auto",
          }}>
            {this.state.stack}
          </pre>
        ) : null}
      </div>
    );
  }
}
