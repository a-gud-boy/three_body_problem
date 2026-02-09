from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True, args=['--enable-unsafe-webgpu'])
    page = browser.new_page()

    # Navigate to the General Relativity page
    url = "http://localhost:3000/three_body_problem/general-relativity"
    print(f"Navigating to {url}")
    page.goto(url)

    # Wait for the canvas to be present
    print("Waiting for canvas...")
    page.wait_for_selector("canvas", timeout=10000)

    # Click the WebGPU button
    # The button text is "WebGPU"
    print("Clicking WebGPU button...")
    page.get_by_text("WebGPU").click()

    # Wait for re-render
    # The canvas component uses a 'key' prop to remount, so the canvas DOM element will be replaced
    # We should wait for the new canvas
    print("Waiting for WebGPU initialization...")
    time.sleep(2) # Give React time to unmount/remount
    page.wait_for_selector("canvas", timeout=10000)

    # Wait for the async WebGPU init (monkey-patched render)
    print("Waiting for render...")
    time.sleep(5)

    # Take a screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/gr_webgpu.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
