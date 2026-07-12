import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./themes.css";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Stoa root element is missing");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
