// Stock lists
const usStocks = ['BRK-B', 'V', 'JPM', 'JNJ', 'PG', 'UNH', 'MA', 'PEP', 'WMT', 'HD'];
const canadianStocks = ['ATD.TO', 'SU.TO', 'MFC.TO', 'NTR.TO', 'POW.TO', 'SLF.TO', 'FFH.TO', 'WN.TO'];

// Function to fetch stock data
async function fetchStockData(symbol) {
    const apiKey = config.alphavantageApiKey;
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
    
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return null;
    }
}

// Function to generate recommendations
function generateRecommendation(stockData) {
    const pegRatio = parseFloat(stockData.PEGRatio);
    const psRatio = parseFloat(stockData.PriceToSalesRatioTTM);
    const dividendYield = parseFloat(stockData.DividendYield) * 100;
    const debtToEquity = parseFloat(stockData.DebtToEquityRatio);
    const operatingMargin = parseFloat(stockData.OperatingMarginTTM) * 100;

    if (pegRatio < 1 && psRatio < 5 && dividendYield > 2 && debtToEquity < 1 && operatingMargin > 15) {
        return 'Buy';
    } else {
        return 'Hold';
    }
}

// Function to generate the report
async function generateReport() {
    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = '<h2>Generating report...</h2>';

    const allStocks = [...usStocks, ...canadianStocks];
    const reportData = [];

    for (const symbol of allStocks) {
        const stockData = await fetchStockData(symbol);
        if (stockData) {
            const recommendation = generateRecommendation(stockData);
            reportData.push({
                name: stockData.Name,
                peRatio: stockData.PERatio,
                pegRatio: stockData.PEGRatio,
                psRatio: stockData.PriceToSalesRatioTTM,
                dividendYield: (parseFloat(stockData.DividendYield) * 100).toFixed(2) + '%',
                debtToEquity: stockData.DebtToEquityRatio,
                operatingMargin: (parseFloat(stockData.OperatingMarginTTM) * 100).toFixed(2) + '%',
                recommendation: recommendation
            });
        }
    }

    // Generate table HTML
    let tableHtml = `
        <table>
            <tr>
                <th>Stock Name</th>
                <th>P/E Ratio</th>
                <th>PEG Ratio</th>
                <th>P/S Ratio</th>
                <th>Dividend Yield</th>
                <th>Debt-to-Equity</th>
                <th>Operating Margin</th>
                <th>Recommendation</th>
            </tr>
    `;

    reportData.forEach(stock => {
        tableHtml += `
            <tr>
                <td>${stock.name}</td>
                <td>${stock.peRatio}</td>
                <td>${stock.pegRatio}</td>
                <td>${stock.psRatio}</td>
                <td>${stock.dividendYield}</td>
                <td>${stock.debtToEquity}</td>
                <td>${stock.operatingMargin}</td>
                <td>${stock.recommendation}</td>
            </tr>
        `;
    });

    tableHtml += '</table>';

    reportDiv.innerHTML = tableHtml;
}

// Event listener for generate report button
document.getElementById('generateReport').addEventListener('click', generateReport);

// Populate stock list
const stockListDiv = document.getElementById('stockList');
stockListDiv.innerHTML = `
    <h3>U.S. Stocks:</h3>
    <ul>${usStocks.map(stock => `<li>${stock}</li>`).join('')}</ul>
    <h3>Canadian Stocks:</h3>
    <ul>${canadianStocks.map(stock => `<li>${stock}</li>`).join('')}</ul>
`;
