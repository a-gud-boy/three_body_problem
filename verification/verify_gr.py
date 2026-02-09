from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to General Relativity page
        print("Navigating to GR Page...")
        url = "http://localhost:5175/three_body_problem/general-relativity"
        page.goto(url)

        # Wait for the page to load
        # Wait a bit longer for Three.js initialization and shader compilation
        page.wait_for_timeout(5000)

        # Take Screenshot of Lensed View
        print("Taking Lensed Screenshot...")
        page.screenshot(path="verification/gr_lensed.png")

        # Toggle Lensing Off
        print("Toggling Lensing OFF...")
        try:
            # Find the input associated with "Gravitational Lensing"
            # Since structure is <div><label>Text</label><input/></div>
            checkbox = page.locator("div").filter(has_text="Gravitational Lensing").locator("input[type='checkbox']")
            checkbox.uncheck()

            # Wait for re-render
            page.wait_for_timeout(2000)

            print("Taking Unlensed Screenshot...")
            page.screenshot(path="verification/gr_unlensed.png")

        except Exception as e:
            print(f"Could not toggle lensing: {e}")

        browser.close()

if __name__ == "__main__":
    run()
