import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("Startseite zeigt den App-Namen als Überschrift", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1, name: "Götterbaum" })).toBeDefined();
});
