from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the General Relativity page
    # Note: Vite uses the base path '/three_body_problem/'
    url = "http://localhost:3000/three_body_problem/general-relativity"
    print(f"Navigating to {url}")
    page.goto(url)

    # Wait for the canvas to be present
    # The canvas is inside a div with absolute inset-0
    print("Waiting for canvas...")
    page.wait_for_selector("canvas", timeout=10000)

    # Wait a bit for the shader to compile and render a few frames
    print("Waiting for render...")
    time.sleep(5)

    # Take a screenshot of the WebGL render
    print("Taking screenshot...")
    page.screenshot(path="verification/gr_webgl.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
