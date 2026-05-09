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

    const items = await getListItems(page);

    for (const item of items) {
        const detail = await getDetailPage(page, item.title);

        item.url = detail.url;
        item.detail = detail.detail;

        await page.goto(searchUrl, {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        await page.waitForTimeout(1000);
    }

    console.log(JSON.stringify(items, null, 2));

    const params = new URLSearchParams();
    params.append('secret', process.env.BANGUMI_SECRET);
    params.append('data', JSON.stringify(items));

    const response = await fetch(process.env.SAVE_URL, {
        method: 'POST',
        body: params
    });

    console.log(await response.text());

    await browser.close();
})();

async function getListItems(page) {
    return await page.evaluate(() => {
        const text = document.body.innerText;
        const lines = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line !== '');

        const results = [];

        for (let i = 0; i < lines.length; i++) {
            const timeMatch = lines[i].match(/^([0-9]{1,2})\/([0-9]{1,2})\((.)\)([0-9]{1,2}:[0-9]{2})～([0-9]{1,2}:[0-9]{2})$/);

            if (!timeMatch) {
                continue;
            }

            const title = lines[i - 1] || '';
            const station = lines[i + 1] || '';

            if (!title || !station) {
                continue;
            }

            results.push({
                title: title,
                month: timeMatch[1],
                day: timeMatch[2],
                week: timeMatch[3],
                time: timeMatch[4] + ' ～ ' + timeMatch[5],
                station: station,
                detail: '',
                url: ''
            });
        }

        return results;
    });
}

async function getDetailPage(page, title) {
    try {
        const locator = page.getByText(title, { exact: true }).first();

        await locator.click({
            timeout: 10000
        });

        await page.waitForLoadState('networkidle', {
            timeout: 60000
        });

        await page.waitForTimeout(1000);

        const url = page.url();
        const detail = await page.evaluate(() => {
            const text = document.body.innerText;
            const lines = text
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line !== '');

            const detailStartWords = [
                '番組内容',
                '番組詳細内容',
                '詳細内容'
            ];

            for (const word of detailStartWords) {
                const index = lines.findIndex((line) => line === word);

                if (index >= 0) {
                    const detailLines = [];

                    for (let i = index + 1; i < lines.length; i++) {
                        if (
                            lines[i] === '出演者' ||
                            lines[i] === '放送スケジュール一覧' ||
                            lines[i] === '同じ出演者' ||
                            lines[i] === '関連番組' ||
                            lines[i] === '録画予約'
                        ) {
                            break;
                        }

                        detailLines.push(lines[i]);
                    }

                    return detailLines.join('\n').trim();
                }
            }

            return '';
        });

        return {
            url: url,
            detail: detail
        };

    } catch (error) {
        return {
            url: '',
            detail: '',
            error: error.message
        };
    }
}
