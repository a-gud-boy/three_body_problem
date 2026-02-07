from playwright.sync_api import Page, expect, sync_playwright
import time

def test_electromagnetic_page(page: Page):
    print("Navigating to Electromagnetic page...")
    page.goto("http://localhost:5174/three_body_problem/electromagnetic")

    # Wait for the canvas to load
    page.wait_for_selector(".em-canvas", timeout=10000)
    print("Canvas found.")

    # Wait for simulation to render initial state
    time.sleep(2)

    # Click "Force Vectors" checkbox
    # The label text is "Force Vectors"
    print("Clicking Force Vectors...")
    page.get_by_label("Force Vectors").click()

    time.sleep(1)

    # Take a screenshot
    page.screenshot(path="verification_force_vectors.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = browser.new_page()
        try:
            test_electromagnetic_page(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
