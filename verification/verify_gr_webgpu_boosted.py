from playwright.sync_api import sync_playwright
import time

def run(playwright):
    # User-suggested arguments for better GPU support
    args = [
        "--enable-unsafe-webgpu",
        "--enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan",
        "--use-angle=vulkan",
        "--ignore-gpu-blocklist",
        "--disable-gpu-sandbox"
    ]

    browser = playwright.chromium.launch(headless=True, args=args)
    page = browser.new_page()

    # Listen to console logs
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"Browser Error: {exc}"))

    url = "http://localhost:3000/three_body_problem/general-relativity"
    print(f"Navigating to {url}")
    page.goto(url)

    # Wait for the canvas
    page.wait_for_selector("canvas", timeout=10000)

    # Click WebGPU
    print("Clicking WebGPU button...")
    page.get_by_role("button", name="WebGPU").click()

    print("Waiting for WebGPU initialization...")
    time.sleep(2)

    # Wait longer for init and render
    time.sleep(10)

    print("Taking screenshot...")
    page.screenshot(path="verification/gr_webgpu_boosted.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
