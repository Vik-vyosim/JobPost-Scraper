const puppeteer = require('puppeteer');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

// Read JSON input
const inputData = JSON.parse(fs.readFileSync('american.json', 'utf8'));

// Define CSV writer
const csvWriter = createObjectCsvWriter({
    path: 'scraped_jobs.csv',
    append: true,
    header: [
        { id: 'Search_Keyword', title: 'Search Keyword' },
        { id: 'Job_Title', title: 'Job Title' },
        { id: 'Company', title: 'Company' },
        { id: 'Location', title: 'Location' },
        { id: 'Rating', title: 'Rating' },
        { id: 'Description', title: 'Description' },
        { id: 'PostDate', title: 'Post Date' },
        { id: 'Salary', title: 'Salary'}
    ]
});



(async () => {
    const browser = await puppeteer.launch({ headless: false });

    const allResults = [];  // Store all results

    for (const item of inputData) {
        const searchKeyword = item.name;
        console.log(`\nRefreshing site before searching for: ${searchKeyword}`);

        const page = await browser.newPage();
        await page.goto('https://www.simplyhired.com/search?', { waitUntil: 'domcontentloaded' });

        try {
            await page.waitForSelector('input[data-testid="findJobsLocationInput"]', { timeout: 10000 });

            console.log("Clearing default location...");
            await page.evaluate(() => {
                const locationInput = document.querySelector('input[data-testid="findJobsLocationInput"]');
                if (locationInput) {
                    locationInput.focus();
                    locationInput.select();
                    document.execCommand('delete');
                }
            });

            console.log("Inserting search keyword...");
            await page.type('input[type="text"]', searchKeyword, { delay: 100 });
            await page.keyboard.press('Enter');

            console.log("Clicking search button...");
            await page.waitForSelector('.chakra-button.css-hmwkwr', { timeout: 10000 });

            // Click search button and wait for navigation
            await Promise.all([
                page.click('.chakra-button.css-hmwkwr'),
                page.waitForNavigation({ waitUntil: 'networkidle2' }) 
            ]);

            console.log("Search submitted! Waiting for job results...");

            // Wait for job list to appear (max 10 seconds)
            try {
                await page.waitForSelector('#job-list', { timeout: 10000 });
                console.log("Job list detected! Waiting for results to stabilize...");
            } catch (error) {
                console.log("Job results took too long to load. Skipping to the next search...");
                await page.close();
                continue;  // Move to the next search term
            }

            // Wait until job elements stop changing (stabilization check)
            try {
                const jobListStabilized = await page.waitForFunction(() => {
                    const jobList = document.querySelector('#job-list');
                    if (!jobList) return false;

                    const jobCount = jobList.children.length;
                    return new Promise(resolve => setTimeout(() => {
                        const newJobCount = jobList.children.length;
                        resolve(newJobCount === jobCount);
                    }, 2000));
                }, { timeout: 10000 });

                if (jobListStabilized) {
                    console.log("Job results stabilized. Extracting data...");
                }
            } catch (error) {
                console.log("Job results took too long to stabilize. Skipping to the next search...");
                await page.close();
                continue;  // Move to the next search term
            }

            // Scrape job details
            const results = await page.evaluate(() => {
                const jobElements = Array.from(document.querySelectorAll('.chakra-button.css-1djbb1k'));
                const companyElements = Array.from(document.querySelectorAll('span[data-testid="companyName"]'));
                const locationElements = Array.from(document.querySelectorAll('span[data-testid="searchSerpJobLocation"]'));
                const ratingElements = Array.from(document.querySelectorAll('span[aria-hidden="true"].css-0'));
                const descriptionElements = Array.from(document.querySelectorAll('.chakra-text.css-jhqp7z'));
                const postElements = Array.from(document.querySelectorAll('.chakra-text.css-5yilgw'));
                const salaryElemnet = Array.from(document.querySelectorAll('.chakra-text.css-1g1y608'));

                return jobElements.map((job, index) => ({
                    Job_Title: job.innerText.trim(),
                    Company: companyElements[index] ? companyElements[index].innerText.trim() : 'No company name found',
                    Location: locationElements[index] ? locationElements[index].innerText.trim() : 'No Location Found',
                    Rating: ratingElements[index] ? ratingElements[index].innerText.trim() : 'No Ratings',
                    Description: descriptionElements[index] ? descriptionElements[index].innerText.trim() : 'No Description',
                    PostDate: postElements[index] ? postElements[index].innerText.trim() : 'No posting Details',
                    Salary : salaryElemnet[index]? salaryElemnet[index].innerText.trim() : 'No Details '
                }));
            });

            if (results.length === 0) {
                console.log("No job listings found.");
            } else {
                const resultsWithKeyword = results.map(job => ({
                    Search_Keyword: searchKeyword,
                    ...job
                }));

                allResults.push(...resultsWithKeyword);
                console.log(`Scraped ${results.length} job(s) for "${searchKeyword}".`);
            }

        } catch (error) {
            console.error(`Error while processing "${searchKeyword}":`, error);
        }

        await page.close();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Delay to avoid detection
    }

    await csvWriter.writeRecords(allResults);
    console.log('CSV file created with job results.');

    await browser.close();
})();
