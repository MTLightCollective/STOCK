// Stock lists
const usStocks = ['BRK-B', 'V', 'JPM', 'JNJ', 'PG', 'UNH', 'MA', 'PEP', 'WMT', 'HD'];
const canadianStocks = ['ATD.TO', 'SU.TO', 'MFC.TO', 'NTR.TO', 'POW.TO', 'SLF.TO', 'FFH.TO', 'WN.TO'];

// Function to fetch stock data
async function fetchStockData(symbol) {
    const apiKey = config.alphavantageApiKey;
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
    
    try {
        const response = await axios.get(url);
        console.log(`Response for ${symbol}:`, response.data);
        if (response.data && Object.keys(response.data).length > 0) {
            return response.data;
        } else {
            console.error(`No data returned for ${symbol}`);
            return null;
        }
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

// Function to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to generate the report
async function generateReport() {
    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = '<h2>Generating report...</h2>';

    const allStocks = [...usStocks, ...canadianStocks];
    const reportData = [];

    for (const symbol of allStocks) {
        const stockData = await fetchStockData(symbol);
        if (stockData && stockData.Symbol) {
            const recommendation = generateRecommendation(stockData);
            reportData.push({
                name: stockData.Name || symbol,
                symbol: symbol,
                peRatio: stockData.PERatio || 'N/A',
                pegRatio: stockData.PEGRatio || 'N/A',
                psRatio: stockData.PriceToSalesRatioTTM || 'N/A',
                dividendYield: stockData.DividendYield ? (parseFloat(stockData.DividendYield) * 100).toFixed(2) + '%' : 'N/A',
                debtToEquity: stockData.DebtToEquityRatio || 'N/A',
                operatingMargin: stockData.OperatingMarginTTM ? (parseFloat(stockData.OperatingMarginTTM) * 100).toFixed(2) + '%' : 'N/A',
                recommendation: recommendation
            });
        } else {
            reportData.push({
                name: symbol,
                symbol: symbol,
                peRatio: 'N/A',
                pegRatio: 'N/A',
                psRatio: 'N/A',
                dividendYield: 'N/A',
                debtToEquity: 'N/A',
                operatingMargin: 'N/A',
                recommendation: 'Data Unavailable'
            });
        }
        await delay(12000); // Wait for 12 seconds between requests to avoid hitting API rate limits
    }

    // Generate table HTML
    let tableHtml = `
        <table>
            <tr>
                <th>Stock</th>
                <th>P/E</th>
                <th>PEG</th>
                <th>P/S</th>
                <th>Div Yield</th>
                <th>Debt/Equity</th>
                <th>Op Margin</th>
                <th>Rec</th>
            </tr>
    `;

    reportData.forEach(stock => {
        tableHtml += `
            <tr>
                <td>${stock.symbol}</td>
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
    <h3>U.S. Stocks</h3>
    <ul>${usStocks.map(stock => `<li>${stock}</li>`).join('')}</ul>
    <h3>Canadian Stocks</h3>
    <ul>${canadianStocks.map(stock => `<li>${stock}</li>`).join('')}</ul>
`;
