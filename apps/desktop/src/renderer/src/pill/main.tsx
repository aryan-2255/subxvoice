import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Pill } from "./Pill";
import "./pill.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <Pill />
  </StrictMode>,
);
