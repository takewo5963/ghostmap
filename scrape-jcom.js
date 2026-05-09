const { chromium } = require('playwright');

const searchUrl = 'https://tvguide.myjcom.jp/search/event/?keyword=%E5%BF%83%E9%9C%8A%20%E6%80%96%E3%81%84%E8%A9%B1%20%E6%80%AA%E5%A5%87%E7%8F%BE%E8%B1%A1%20%E4%B8%96%E3%81%AB%E3%82%82%E5%A5%87%E5%A6%99%E3%81%AA%E7%89%A9%E8%AA%9E%20%E6%9C%80%E6%81%90%E6%98%A0%E5%83%8F%20%E7%B5%B6%E6%81%90%E6%98%A0%E5%83%8F&keywordType=or&channelType=2&channel=1024_32736%2C1032_32737%2C1040_32738%2C1048_32739%2C1056_32740%2C1064_32741%2C1072_32742%2C23608_32391%2C24632_32375%2C29752_32295%2C00052_0%2C00021_0';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(searchUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
    });

    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const links = [];

        document.querySelectorAll('a').forEach((a) => {
            const href = a.getAttribute('href') || '';
            const text = a.textContent.trim();

            if (href.includes('/program/') || text.includes('心霊') || text.includes('怖い')) {
                links.push({
                    text: text,
                    href: href
                });
            }
        });

        return {
            title: document.title,
            bodyStart: bodyText.substring(0, 3000),
            linkCount: links.length,
            links: links.slice(0, 20)
        };
    });

    console.log(JSON.stringify(result, null, 2));

    await browser.close();
})();
