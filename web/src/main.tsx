import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import PeoplePage from "./people/PeoplePage";
import { takePeopleBootstrapCode } from "./people/client";
import "./themes.css";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Stoa root element is missing");
}

const peoplePath = ["/people", "/people/", "/api/agora/people", "/api/agora/people/"]
  .includes(window.location.pathname);
const peopleBootstrapCode = peoplePath ? takePeopleBootstrapCode() : null;

createRoot(root).render(
  <StrictMode>
    {peoplePath ? <PeoplePage bootstrapCode={peopleBootstrapCode} /> : <App />}
  </StrictMode>,
);
