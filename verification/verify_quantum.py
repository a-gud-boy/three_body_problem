import time
from playwright.sync_api import sync_playwright

def verify_quantum_sandbox():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
             args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan",
                "--use-angle=vulkan",
                "--ignore-gpu-blocklist",
                "--disable-gpu-sandbox"
            ]
        )
        page = browser.new_page()

        # Listen for errors
        page.on("console", lambda msg: print(f"Console ({msg.type}): {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))

        base_url = "http://localhost:5173/three_body_problem/"
        print(f"Navigating to Home: {base_url}...")

        try:
            page.goto(base_url, wait_until="networkidle")

            # Find the link
            link = page.locator('a[href="#/quantum-sandbox"]')
            if link.count() > 0:
                print("Found link to Quantum Sandbox.")
                link.click()
                print("Clicked link.")

                # Wait for navigation
                page.wait_for_timeout(2000)

                print("Checking for canvas...")
                if page.locator("canvas").count() > 0:
                     print("SUCCESS: Canvas found on Quantum Sandbox page.")
                else:
                     print("FAIL: Canvas not found.")
                     # Check for error overlay
                     if page.locator("text=WebGPU is not supported").count() > 0:
                         print("WebGPU Error Overlay is visible.")
                     else:
                         print("No canvas and no specific error overlay found.")
            else:
                print("Link to Quantum Sandbox NOT found on Home Page.")

            page.screenshot(path="verification/quantum_interaction.png")

        except Exception as e:
            print(f"Script Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_quantum_sandbox()
