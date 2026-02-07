import sys
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate
        url = "http://localhost:5173/three_body_problem/atom-simulator"
        print(f"Navigating to {url}...")
        page.goto(url)

        # Wait for load
        print("Waiting for page load...")
        try:
            page.wait_for_selector("text=Atom Simulator", timeout=30000)
        except Exception as e:
            print(f"Error waiting for page load: {e}")
            page.screenshot(path="verification/error_load.png")
            browser.close()
            sys.exit(1)

        # Switch to Compound Builder mode
        print("Switching to Compound Builder...")
        try:
            compound_tab = page.locator("button.mode-tab", has_text="Compound Builder")
            compound_tab.click()
            # Wait for empty state or periodic table
            page.wait_for_selector(".empty-state")
        except Exception as e:
            print(f"Error clicking compound tab or waiting for state: {e}")
            page.screenshot(path="verification/error_tab.png")
            browser.close()
            sys.exit(1)

        # Add Hydrogen (H)
        print("Adding Hydrogen...")
        try:
            # Click Hydrogen in the periodic table (left panel)
            # Use specific selector to ensure we click the button
            page.locator("button.element-cell[title*='Hydrogen']").first.click()

            # Now visualizer should appear
            page.wait_for_selector(".compound-visualizer", timeout=5000)

            # Add Oxygen (O)
            print("Adding Oxygen...")
            page.locator("button.element-cell[title*='Oxygen']").first.click()

            # Add Hydrogen (H) again
            print("Adding Hydrogen...")
            page.locator("button.element-cell[title*='Hydrogen']").first.click()

        except Exception as e:
            print(f"Error adding atoms: {e}")
            page.screenshot(path="verification/error_atoms.png")
            browser.close()
            sys.exit(1)

        # Wait a bit for render
        page.wait_for_timeout(2000)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/compound_visualizer.png")

        browser.close()
        print("Done.")

if __name__ == "__main__":
    run()
