// import puppeteer from 'puppeteer';
const fs = require("fs");
const { Parser } = require("json2csv");

const puppeteer = require("puppeteer");


const sleep = sec => new Promise(r => setTimeout(r, sec * 1000));

const coompanyList = [
    "softlabs",
    "infosys",
];


(async () => {
    let browser = null
    let page = null

    try {
        browser = await puppeteer.launch({
            headless: false,
            devtools: false,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--incognito',
            ],
            slowMo: 100
        })
        page = await browser.newPage()

        // Setting view port to max to get jobs description on the right side 
        await page.setViewport({width: 1920, height: 1080});
    
        // f_TPR=r604800 = past week
        for (let companyName of coompanyList) {
            const data = await getCompanyJobsPostings(page, companyName)
            await writeToCSV(data)
        }


    } catch (error){
        console.log("Error: ", error)
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
})();


async function getCompanyJobsPostings(page, companyName) {
    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${companyName}&f_TPR=r86400`
    await page.goto(searchUrl, { waitUntil: ["domcontentloaded"] });

    // Close Signin Dialoug Box
    // const closeDialog = await page.$("section[role='dialog'] * button[aria-label='Dismiss'][data-tracking-control-name='public_jobs_contextual-sign-in-modal_sign-in-modal_dismiss']");
    const closeDialog = await page.waitForSelector("section[role='dialog'] * button[aria-label='Dismiss'][data-tracking-control-name='public_jobs_contextual-sign-in-modal_sign-in-modal_dismiss", { timeout: 10000 }).catch(() => null)
    if (closeDialog) await closeDialog.click();
    
    const results = await page.$("p.no-results__subheading")
    if (results) return null
    
    // Get Company Data 
    await page.waitForSelector("ul.jobs-search__results-list > li > div > a", { timeout: 10000 }).catch(() => null);
    const jobsPostList = await page.$$("ul.jobs-search__results-list > li > div > a")
    const postInfoList = []
    if (jobsPostList.length) {
        for (let jobPost of jobsPostList.slice(0, 3)) {
            await jobPost.click()
            const postInfo = await getJobsPostInfo(page)
            postInfoList.push(postInfo)
        }
        console.log(postInfoList)
    }

    return postInfoList
}


async function getJobsPostInfo(page) {
    // Get Job Post Description / Info 
    await page.waitForSelector("div.details-pane__content.details-pane__content--show", { timeout: 10000 }).catch(() => null);
    const section = await page.$("div.details-pane__content.details-pane__content--show")

    const jobTitle = await section.$("a[data-tracking-control-name='public_jobs_topcard-title']")
    const organization = await section.$("a[data-tracking-control-name='public_jobs_topcard-org-name']")
    const postedDuration = await section.$("span.posted-time-ago__text")
    const payRange = await section.$("div.salary.compensation__salary")
    const jobDescription = await section.$("div.description__text.description__text--rich")
    const jobCriteria = await section.$$("ul.description__job-criteria-list * span.description__job-criteria-text--criteria")

    return {
        jobTitle: jobTitle ? await page.evaluate(el => el.textContent.trim(), jobTitle) : null,
        organizationName: organization ? await page.evaluate(el => el.textContent.trim(), organization) : null,
        organizationLink: organization ? await page.evaluate(el => el.href, organization) : null,
        postedDuration: postedDuration ? await page.evaluate(el => el.textContent.trim(), postedDuration) : null,
        payRange: payRange ? await page.evaluate(el => el.textContent.trim(), payRange) : null,    
        jobDescription: jobDescription ? await page.evaluate(el => el.textContent.replaceAll(/\s+/g, " "), jobDescription) : null,
        seniorityLevel: jobCriteria[0] ? await page.evaluate(el => el.textContent.trim(), jobCriteria[0]) : null,
        employmentType: jobCriteria[1] ? await page.evaluate(el => el.textContent.trim(), jobCriteria[1]) : null,
        jobFunction: jobCriteria[2] ? await page.evaluate(el => el.textContent.trim(), jobCriteria[2]) : null,
        industry: jobCriteria[3] ? await page.evaluate(el => el.textContent.trim(), jobCriteria[3]) : null,
    }
}


const writeToCSV = async (data, fileName = "data.csv") => {
    const fields = [
        "jobTitle", 
        "organizationName", 
        "organizationLink", 
        "postedDuration", 
        "payRange", 
        "jobDescription", 
        "seniorityLevel", 
        "employmentType", 
        "jobFunction", 
        "industry"
    ]

    const headerParser = new Parser({ fields, header: false })
    const csv = headerParser.parse(data) + "\r\n";

    fs.stat(fileName, function(err, stat) {
        if (err == null) {
            fs.appendFile(fileName, csv, function() {
                if (err) throw err;
                // console.log("Data Appended...")
            });
        }
        else {
            const headerParser = new Parser({ fields, header: true });
            const headerCsv = headerParser.parse([]) + "\r\n"; 
            
            fs.writeFile('file.csv', headerCsv + csv, function (err) {
                if (err) throw err;
                // console.log('File created and data written!');
            });
        }
    });
}