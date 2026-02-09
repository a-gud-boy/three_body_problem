from playwright.sync_api import sync_playwright
import time

def run(playwright):
    # Launch with arguments to enable WebGPU and potentially software rendering if hardware is missing
    # --use-gl=angle --use-angle=vulkan might help in some docker containers but --enable-unsafe-webgpu is key
    browser = playwright.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
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
    # Using a more specific locator to ensure we hit the button
    page.get_by_role("button", name="WebGPU").click()

    print("Waiting for WebGPU initialization...")
    time.sleep(2)

    # Wait longer for init
    time.sleep(8)

    print("Taking screenshot...")
    page.screenshot(path="verification/gr_webgpu.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
