from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        url = "http://localhost:5173/three_body_problem/three-body"
        print(f"Navigating to {url}")
        page.goto(url)

        # Wait for the page to load and canvas to appear
        expect(page.locator("canvas")).to_be_visible(timeout=10000)

        # Wait for Body labels to appear in the DOM
        # My optimization renders them as <div> elements with text "Body X"
        print("Waiting for 'Body 1' label...")
        body1_label = page.get_by_text("Body 1", exact=False).first
        expect(body1_label).to_be_visible(timeout=10000)

        print("Waiting for 'Body 2' label...")
        body2_label = page.get_by_text("Body 2", exact=False).first
        expect(body2_label).to_be_visible()

        print("Taking screenshot...")
        page.screenshot(path="verification/verification.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    run()
