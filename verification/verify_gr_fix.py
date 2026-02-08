from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the General Relativity page
        # Note: Adjust the URL if the local dev server is running on a different port or path
        # The prompt mentioned "three_body_problem" base path in vite config memory,
        # but locally it might just be localhost:5173

        # Try navigating to home first to confirm server is up
        try:
            page.goto("http://localhost:5173/three_body_problem/")
            print("Navigated to Home")

            # Find the link to General Relativity (assuming there is one, or navigate directly)
            # If no direct link on home, we go direct
            page.goto("http://localhost:5173/three_body_problem/general-relativity")
            print("Navigated to GR Page")

            # Wait for canvas to load
            page.wait_for_selector("canvas", state="visible")

            # Take screenshot of WebGL mode (default)
            page.screenshot(path="verification/gr_fix_webgl.png")
            print("Captured WebGL screenshot")

            # Click WebGPU button
            # Button text is "WebGPU"
            page.get_by_role("button", name="WebGPU").click()
            print("Clicked WebGPU button")

            # Wait a bit for the async init to potentially crash or succeed
            time.sleep(2)

            # Check for error overlay
            if page.locator("text=Simulation Error").is_visible():
                print("Error detected!")
                page.screenshot(path="verification/gr_error.png")
            else:
                print("No crash detected.")
                page.screenshot(path="verification/gr_fix_webgpu.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
