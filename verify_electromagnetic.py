from playwright.sync_api import Page, expect, sync_playwright
import time

def test_electromagnetic_page(page: Page):
    print("Navigating to Electromagnetic page...")
    page.goto("http://localhost:5174/three_body_problem/electromagnetic")

    print("Page title:", page.title())

    # Wait for the canvas to load
    try:
        page.wait_for_selector(".em-canvas", timeout=10000)
        print("Canvas found.")
    except Exception as e:
        print("Canvas not found:", e)
        # Maybe try finding by text?
        if page.get_by_text("Electromagnetic Fields").is_visible():
             print("Title found.")
        else:
             print("Title not found.")

    # Wait for simulation to render
    time.sleep(3)

    # Take a screenshot
    page.screenshot(path="verification_electromagnetic.png")
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
