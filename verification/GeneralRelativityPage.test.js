import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GeneralRelativityPage from "../src/pages/GeneralRelativity/GeneralRelativityPage";
import { BrowserRouter } from "react-router-dom";
import { WebGPURenderer } from "three/webgpu";

// Mock three/webgpu
jest.mock("three/webgpu", () => ({
  WebGPURenderer: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(),
    render: jest.fn(),
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement("canvas"),
  })),
}));

// Mock @react-three/fiber Canvas
jest.mock("@react-three/fiber", () => ({
  ...jest.requireActual("@react-three/fiber"),
  Canvas: ({ children, gl, ...props }) => {
    // Simulate what R3F does: call the gl callback
    if (typeof gl === "function") {
      const mockCanvas = { canvas: document.createElement("canvas") };
      gl(mockCanvas);
    }
    return <div>Canvas Mock</div>;
  },
}));

describe("GeneralRelativityPage", () => {
  it("initializes WebGPURenderer correctly without crashing", async () => {
    render(
      <BrowserRouter>
        <GeneralRelativityPage />
      </BrowserRouter>
    );

    // Switch to WebGPU
    const webgpuBtn = screen.getByText("WebGPU");
    fireEvent.click(webgpuBtn);

    await waitFor(() => {
      expect(WebGPURenderer).toHaveBeenCalled();
    });
  });
});
