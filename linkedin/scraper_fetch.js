import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { Parser } from "json2csv";
import fs from "fs";

const sleep = sec => new Promise((r) => setTimeout(r, sec * 1000));

const companyNameList = [
    "infosys",
    "arctern"
];

(async () => {
    for (let companyName of companyNameList) {
        const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${companyName}&f_TPR=r86400`
    
        const html = await fetchHTML(searchUrl)
        const jobInfoList = await getJobPostings(html, searchUrl)
        await storeDataToCSV(jobInfoList)
    }
})();


  
async function fetchHTML(searchUrl, referenceURL = null) {
    const headers = {
        'method': 'GET', // method
        'content-type': 'text/html; charset=utf-8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8', // accepted format of receving data
        "Accept-Language": "en-US,en;q=0.9", // accepted language
        'headers': { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }, // device
        // 'Connection': 'keep-alive', // connection type
        'Upgrade-Insecure-Requests': '1' 
    }
    if (referenceURL) headers['Referer'] = referenceURL // refrence url navigated from

    const response = await fetch(searchUrl, headers)
    if (!response.ok) throw new Error(`Response Status: ${response.status}`);

    return response.text()
}


async function getJobPostings(html, referenceURL) {
    const postLinks = await getPostLinks(html)
    const jobPostInfo = []
    for (let links of postLinks) {
        await sleep(Math.random() * 3 + 2)
        const postHtml = await fetchHTML(links, referenceURL)
        const jobDesc = await getJobDescription(postHtml)
        jobPostInfo.push(jobDesc)
    }

    console.log(jobPostInfo)
    return jobPostInfo
}


async function getPostLinks(html) {
    const $ = cheerio.load(html)
    const link = $('ul.jobs-search__results-list > li > div > a')
        .map((i, ele) => $(ele).attr("href"))
        .get();

    // console.log(link)
    return link
}


async function getJobDescription(postHtml) {
    const $ = cheerio.load(postHtml)
    
    const jobTitle = $("section.container-lined * h1").text()
    const jobDesc = $("div.description__text > section > div").text()
    const jobInfo = $("section.container-lined * div.topcard__flavor-row > span")
        .map((i, ele) => $(ele).text())
        .get()
    const jobInfoExtra = $("span.description__job-criteria-text.description__job-criteria-text--criteria")
        .map((i, ele) => $(ele).text())
        .get()

    return {
        jobTitle: jobTitle || null,
        company: jobInfo[0].trim() || null,
        location: jobInfo[1].trim() || null,
        seniorityLevel: jobInfoExtra[0].trim() || null,
        employmentType: jobInfoExtra[1].trim() || null,
        jobFunction: jobInfoExtra[2].trim() || null,
        industry: jobInfoExtra[3].trim() || null,
        jobDesc: jobDesc.trim() || null,
    }
}

const storeDataToCSV = (data, fileName = "data.csv") => {
    const fields = [
        "jobTitle",
        "company",
        "location",
        "seniorityLevel",
        "employmentType",
        "jobFunction",
        "industry",
        "jobDesc",
    ]

    const headerParser = new Parser({fields, header: false})
    const csv = headerParser.parse(data)

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
            
            fs.writeFile(fileName, headerCsv + csv, function (err) {
                if (err) throw err;
                // console.log('File created and data written!');
            });
        }
    });

}