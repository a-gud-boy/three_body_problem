import time
from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the Concept page for Fluid Dynamics
        page.goto('http://localhost:5173/#/concept/fluid-dynamics')

        # Wait for content to load
        page.wait_for_selector('.concept-title')

        # Take a screenshot of the Fluid Dynamics concept page
        page.screenshot(path='verification/concept_fluid_dynamics.png')

        print("Screenshot saved to verification/concept_fluid_dynamics.png")

        # Also check the Concept page for Wave Interference to ensure it hasn't been broken
        page.goto('http://localhost:5173/#/concept/wave-interference')
        page.wait_for_selector('.concept-title')
        page.screenshot(path='verification/concept_wave_interference.png')
        print("Screenshot saved to verification/concept_wave_interference.png")

        browser.close()

if __name__ == '__main__':
    verify_changes()
