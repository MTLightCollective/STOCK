// Stock lists
const usStocks = ['BRK-B', 'V', 'JPM', 'JNJ', 'PG', 'UNH', 'MA', 'PEP', 'WMT', 'HD'];
const canadianStocks = ['ATD.TO', 'SU.TO', 'MFC.TO', 'NTR.TO', 'POW.TO', 'SLF.TO', 'FFH.TO', 'WN.TO'];

// Function to fetch stock data from Financial Modeling Prep API
async function fetchStockData(symbol) {
    console.log(`Attempting to fetch stock data for ${symbol}`);

    // Check if we have cached data
    const cachedData = localStorage.getItem(`fmp_${symbol}`);
    if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Check if the cached data is less than 24 hours old
        if (new Date().getTime() - parsedData.timestamp < 24 * 60 * 60 * 1000) {
            console.log(`Using cached data for ${symbol}`);
            return parsedData.data;
        }
    }

    const apiKey = config.fmpApiKey; // Make sure to add this to your config.js file
    const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`;

    try {
        const response = await axios.get(url);
        const stockData = response.data[0];
        console.log(`Stock data for ${symbol}:`, stockData);
        
        // Extract the relevant data from the API response
        const data = {
            Symbol: symbol,
            Name: stockData.companyName,
            PERatio: stockData.pe,
            PEGRatio: stockData.peg,
            PriceToSalesRatioTTM: stockData.priceToSalesRatio,
            DividendYield: stockData.lastDividendYield,
            DebtToEquityRatio: stockData.debtToEquity,
            OperatingMarginTTM: stockData.operatingMargin
        };
        
        // Cache the data
        localStorage.setItem(`fmp_${symbol}`, JSON.stringify({
            data: data,
            timestamp: new Date().getTime()
        }));
        
        return data;
    } catch (error) {
        console.error(`Error fetching stock data for ${symbol}:`, error);
        return null;
    }
}

// Function to generate recommendations
function generateRecommendation(stockData) {
    if (!stockData) return 'Data Unavailable';
    
    const pegRatio = parseFloat(stockData.PEGRatio);
    const psRatio = parseFloat(stockData.PriceToSalesRatioTTM);
    const dividendYield = parseFloat(stockData.DividendYield) * 100;
    const debtToEquity = parseFloat(stockData.DebtToEquityRatio);
    const operatingMargin = parseFloat(stockData.OperatingMarginTTM) * 100;

    if (!isNaN(pegRatio) && !isNaN(psRatio) && !isNaN(dividendYield) && !isNaN(debtToEquity) && !isNaN(operatingMargin)) {
        if (pegRatio < 1 && psRatio < 5 && dividendYield > 2 && debtToEquity < 1 && operatingMargin > 15) {
            return 'Buy';
        } else {
            return 'Hold';
        }
    } else {
        return 'Insufficient Data';
    }
}

// Function to generate the report
async function generateReport() {
    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = '<h2>Generating report...</h2>';

    const allStocks = [...usStocks, ...canadianStocks];
    const reportData = [];

    for (const symbol of allStocks) {
        reportDiv.innerHTML = `<h2>Generating report... (${symbol})</h2>`;
        
        const stockData = await fetchStockData(symbol);
        
        if (stockData) {
            const recommendation = generateRecommendation(stockData);
            
            reportData.push({
                name: stockData.Name || symbol,
                symbol: symbol,
                peRatio: stockData.PERatio?.toFixed(2) || 'N/A',
                pegRatio: stockData.PEGRatio?.toFixed(2) || 'N/A',
                psRatio: stockData.PriceToSalesRatioTTM?.toFixed(2) || 'N/A',
                dividendYield: stockData.DividendYield ? (stockData.DividendYield * 100).toFixed(2) + '%' : 'N/A',
                debtToEquity: stockData.DebtToEquityRatio?.toFixed(2) || 'N/A',
                operatingMargin: stockData.OperatingMarginTTM ? (stockData.OperatingMarginTTM * 100).toFixed(2) + '%' : 'N/A',
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

        // Small delay to avoid overwhelming the service
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    displayReport(reportData);
}

// Function to display the report
function displayReport(reportData) {
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

    const reportDiv = document.getElementById('report');
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

// Add a button to clear the cache
const clearCacheButton = document.createElement('button');
clearCacheButton.textContent = 'Clear Cached Data';
clearCacheButton.onclick = function() {
    localStorage.clear();
    alert('Cached data cleared');
};
document.body.appendChild(clearCacheButton);
