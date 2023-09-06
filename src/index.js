/* const puppeteer = require("puppeteer"); */

const express = require('express');
const { linksAmazon } = require('./linksAmazon');
const app = express();

const port = 4000
app.listen(port, () => {
    console.log("Rodando na porta: " + port);

    // Chama a função linksAmazon automaticamente quando o servidor inicia
    linksAmazon().then(() => {
        console.log('Processo do Puppeteer concluído.');
    }).catch(error => {
        console.error('Erro ao executar o Puppeteer:', error);
    });
})

app.get('/', (req, res) => {
    res.send("Servidor rodandno")
})



/* app.get('/api', (req, res) => {
    linksAmazon(res)
}) */
