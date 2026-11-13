import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ThemeProvider } from "./lib/ThemeContext.jsx";
import { AuthProvider } from "./lib/AuthContext.jsx";
import { ToastProvider } from "./lib/ToastContext.jsx";
import { ContentProvider } from "./lib/content.jsx";
import { PlanProvider } from "./lib/PlanContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ContentProvider>
              <PlanProvider>
                <App />
              </PlanProvider>
            </ContentProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
