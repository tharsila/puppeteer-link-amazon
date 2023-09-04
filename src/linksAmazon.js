require("dotenv").config();
const data = require("./data.json");
const puppeteer = require('puppeteer-core');
const mysql = require("mysql2/promise");
const chromium = require('chrome-aws-lambda');
const fs = require("fs");

const url =
    "https://www.amazon.com.br/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.com.br%2F%3Fref_%3Dnav_ya_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=brflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0"
;

const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;


const linksAmazon = async (res) => {
    const connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_DATABASE,
    });
    
    try {
        const browser = await puppeteer.launch({
            args:[...chromium.args, '--hide-scrollbars', '--disable-web-security'],
            executablePath: process.env.CHROME_PATH || await chromium.executablePath,
            headless: true,
            ignoreDefaultArgs: ['--disable-extensions'],
        });
        const page = await browser.newPage();
       
        console.log("iniciou");
        
        await page.goto(url);
        console.log("foi para url");
    
        //preenchimento do campo email
        await page.type('[name="email"]', process.env.AMAZON_EMAIL);
        await page.waitForSelector("#continue");
        await page.click("#continue");
    
        //preenchimento do campo senha
        await page.waitForSelector("#ap_password");
        await page.type('[name="password"]', process.env.AMAZON_PASSWORD);
        await page.waitForSelector("#signInSubmit");
        await page.click("#signInSubmit");
    
        
    
        connection.connect();
        let lastId = data.lastID;


        const [rows, fields] = await connection.execute(
            `SELECT * FROM books WHERE id > ${lastId}`
        );
       
        for (const row of rows) {
            console.log('o titulo: ' + row.title)
            const title = row.title;
            const bookId = row.id;

            await page.waitForSelector("#twotabsearchtextbox");
            await page.$eval('#twotabsearchtextbox', input => input.value = '');
            await page.waitForTimeout(3000);

           
            const optionValue = 'search-alias=stripbooks';
            await page.select('select#searchDropdownBox', optionValue);
            await page.waitForTimeout(1000);
            await page.type('[name="field-keywords"]', title);
            await page.click("#nav-search-submit-text");
      
            await page.waitForSelector(".a-link-normal");
            await page.click(".a-link-normal");
      
            await page.waitForSelector("#amzn-ss-text-link a");
            const element = await page.$("#amzn-ss-text-link span");
      
            await page.waitForTimeout(4000);
            await element.click();
      
            console.log("clicou no link associado");
            await page.waitForTimeout(4000);
      
            await page.waitForSelector("#amzn-ss-text-shortlink-textarea");
            const conteudoTextarea = await page.evaluate(() => {
              const textareaElement = document.querySelector(
                "#amzn-ss-text-shortlink-textarea"
              );
              return textareaElement.value;
            });

            if (conteudoTextarea && conteudoTextarea.trim() !== '') {
                const updateQuery = `UPDATE books SET link_amazon = ? WHERE id = ? AND (link_amazon IS NULL OR link_amazon = '')`;
                await connection.execute(updateQuery, [conteudoTextarea, bookId]);
                console.log(`Link Amazon adicionado para o livro com ID ${bookId}`);
              }

            data.lastID = bookId;
            fs.writeFileSync('src/data.json', JSON.stringify(data));
            console.log('link_associado: ' + conteudoTextarea);
        }

        await browser.close();
    } catch (error) {
        console.error("Erro ao buscar os livros:", error);
    } finally {
        connection.end();
    }
}

module.exports = { linksAmazon };
