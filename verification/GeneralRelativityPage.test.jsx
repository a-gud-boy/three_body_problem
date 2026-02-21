import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GeneralRelativityPage from "../src/pages/GeneralRelativity/GeneralRelativityPage";
import { BrowserRouter } from "react-router-dom";
import { WebGPURenderer } from "three/webgpu";
import { vi, describe, it, expect } from 'vitest';

// Mock three/webgpu and three/tsl
vi.mock("three/webgpu", () => ({
  WebGPURenderer: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(),
    render: vi.fn(),
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement("canvas"),
  })),
  MeshStandardNodeMaterial: vi.fn(),
}));

vi.mock("three/tsl", () => {
  return new Proxy({}, {
    get: () => vi.fn()
  });
});

// Mock @react-three/fiber Canvas
vi.mock("@react-three/fiber", async () => {
  const actual = await vi.importActual("@react-three/fiber");
  return {
    ...actual,
    Canvas: ({ gl }) => {
      // Simulate what R3F does: call the gl callback
      if (typeof gl === "function") {
        const mockCanvas = { canvas: document.createElement("canvas") };
        gl(mockCanvas);
      }
      return <div>Canvas Mock</div>;
    },
    mesh: () => <mesh />,
  };
});

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
