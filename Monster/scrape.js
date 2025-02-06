const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Set a custom user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set cookies before navigating
    const cookies = [
        { name: "fingerprint", value: "zc5daefb817a4e94571eb2cfb59188212", domain: ".monster.com", path: "/" },
        { name: "AWSALB", value: "887+nnidPA193eNiBOA7tGw9riy4BTJAZ1ywId7qeb6H/LoF3qAObOOel7ZClEG3Hom971h8hJhNBs2Of3jCO5Tn/GRL+0K/8APfgngJBeUCgBhUUwngHXExyLtM", domain: ".monster.com", path: "/" },
        { name: "AWSALBCORS", value: "887+nnidPA193eNiBOA7tGw9riy4BTJAZ1ywId7qeb6H/LoF3qAObOOel7ZClEG3Hom971h8hJhNBs2Of3jCO5Tn/GRL+0K/8APfgngJBeUCgBhUUwngHXExyLtM", domain: ".monster.com", path: "/" },
        { name: "install_banner", value: "true", domain: ".monster.com", path: "/" },
        { name: "svx_authenticated", value: "false", domain: ".monster.com", path: "/" },
        { name: "_splunk_rum_sid", value: "%7B%22id%22%3A%22f899621e04d801fba84f3aae49286ea2%22%2C%22startTime%22%3A1738824879818%7D", domain: ".monster.com", path: "/" },
        { name: "AMP_5170b2d537", value: "eyJkZXZpY2VJZCI6ImZhNDAzMjZkLTI1OWEtNGVmNS1iNzYzLTdlMjY3ZWY1OGIxNiJ9", domain: ".monster.com", path: "/" },
        { name: "mn_ja3", value: "d1bedfb0ee9363b817c534235b19fa0e", domain: ".monster.com", path: "/" },
        { name: "datadome", value: "Cq66apcB~THgsBGi9dkScEt89TgWjNFlfvDkeWl2mlglLcZgsl6CXOJLMGcL3skXeExYqDaIKgbujVB2fvYxMStEAuYIxsXonmH7oQwphYnZj9RY3ZNmYax2~l7ypRfS", domain: ".monster.com", path: "/" }
    ];

    await page.setCookie(...cookies);

    // Navigate to the website
    await page.goto('https://www.monster.com/jobs/search', { waitUntil: 'domcontentloaded' });

    console.log("Cookies set and page loaded!");

    // Type job search query
    await page.waitForSelector('input[type="search"]', { timeout: 10000 });
    await page.type('input[type="search"]', 'cognizant', { delay: 100 });

    // Wait for the button to become enabled
    await page.waitForFunction(() => {
        const btn = document.querySelector('[data-testid="searchbar-submit-button-desktop"]');
        return btn && !btn.disabled;
    }, { timeout: 10000 });

    // Click the button and wait for navigation
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }), // Wait for navigation
        page.click('[data-testid="searchbar-submit-button-desktop"]') // Click button
    ]);

    console.log("Search button clicked, and page loaded!");

    // Wait for job titles to appear
    await page.waitForSelector('[data-testid="jobTitle"]');

    // Extract job titles
    const result = await page.evaluate(() => {
        const titleElements = Array.from(document.querySelectorAll('.indexmodern__Title-sc-9vl52l-19.coXmbR'));
        const companyElement = Array.from(document.querySelectorAll('[data-testid="company"]'));
        const locationElements = Array.from(document.querySelectorAll('[data-testid="jobDetaLocation"]'));
        const postElements = Array.from(document.querySelectorAll('[data-testid="jobDetailDateRecency"]'));

        return titleElements.map((job, index) => ({
            Job_Title: titleElements[index]? titleElements[index].innerText.trim():'no title found',
            Company : companyElement[index]? companyElement[index].innerText.trim():'no company found',
            Location : locationElements[index]? locationElements[index].innerText.trim():'no lacation',
            Post : postElements[index]? postElements[index].innerText.trim():'no posting date'
        }));
    });

    console.log("Extracted Job Titles:", result);

    // Uncomment if you want to close the browser
         await browser.close();
})();
