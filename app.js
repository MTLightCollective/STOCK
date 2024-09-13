// Stock lists with names
const usStocks = [
    {symbol: 'BRK-B', name: 'Berkshire Hathaway'},
    {symbol: 'V', name: 'Visa'},
    {symbol: 'JPM', name: 'JPMorgan Chase'},
    {symbol: 'JNJ', name: 'Johnson & Johnson'},
    {symbol: 'PG', name: 'Procter & Gamble'},
    {symbol: 'UNH', name: 'UnitedHealth Group'},
    {symbol: 'MA', name: 'Mastercard'},
    {symbol: 'WMT', name: 'Walmart'},
    {symbol: 'HD', name: 'Home Depot'}
];

const canadianStocks = [
    {symbol: 'ATD.TRT', name: 'Alimentation Couche-Tard'},
    {symbol: 'SU.TRT', name: 'Suncor Energy'},
    {symbol: 'MFC.TRT', name: 'Manulife Financial'},
    {symbol: 'NTR.TRT', name: 'Nutrien'},
    {symbol: 'POW.TRT', name: 'Power Corporation of Canada'},
    {symbol: 'SLF.TRT', name: 'Sun Life Financial'},
    {symbol: 'FFH.TRT', name: 'Fairfax Financial'},
    {symbol: 'WN.TRT', name: 'George Weston Limited'},
    {symbol: 'XIU.TRT', name: 'iShares S&P/TSX 60 Index ETF'}
];

// Function to fetch stock data from Alpha Vantage
async function fetchStockData(symbol) {
    console.log(`Attempting to fetch data for ${symbol}`);
    
    // Check if we have cached data
    const cachedData = localStorage.getItem(`av_${symbol}`);
    if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Check if the cached data is less than 24 hours old
        if (new Date().getTime() - parsedData.timestamp < 24 * 60 * 60 * 1000) {
            console.log(`Using cached Alpha Vantage data for ${symbol}`);
            return parsedData.data;
        }
    }

    // Check if config and API key are defined
    if (typeof config === 'undefined' || !config.alphavantageApiKey) {
        console.error('Alpha Vantage API key is not defined. Please check your config.js file.');
        return null;
    }

    const apiKey = config.alphavantageApiKey;
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
    
    try {
        const response = await axios.get(url);
        console.log(`Alpha Vantage response for ${symbol}:`, response.data);
        
        if (response.data && Object.keys(response.data).length > 0 && !response.data.hasOwnProperty('Note')) {
            // Cache the data with a timestamp
            localStorage.setItem(`av_${symbol}`, JSON.stringify({
                data: response.data,
                timestamp: new Date().getTime()
            }));
            return response.data;
        } else {
            console.error(`No valid data returned from Alpha Vantage for ${symbol}`, response.data);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching Alpha Vantage data for ${symbol}:`, error);
        return null;
    }
}

// Function to generate recommendations
function generateRecommendation(stockData) {
    if (!stockData) return 'Data Unavailable';
    
    const pegRatio = parseFloat(stockData.PEGRatio);
    const psRatio = parseFloat(stockData.PriceToSalesRatioTTM);
    const dividendYield = parseFloat(stockData.DividendYield) * 100;
    const operatingMargin = parseFloat(stockData.OperatingMarginTTM) * 100;

    let buyConditions = 0;
    let totalConditions = 0;

    if (!isNaN(pegRatio)) {
        totalConditions++;
        if (pegRatio < 1) buyConditions++;
    }
    if (!isNaN(psRatio)) {
        totalConditions++;
        if (psRatio < 5) buyConditions++;
    }
    if (!isNaN(dividendYield)) {
        totalConditions++;
        if (dividendYield > 2) buyConditions++;
    }
    if (!isNaN(operatingMargin)) {
        totalConditions++;
        if (operatingMargin > 15) buyConditions++;
    }

    if (totalConditions === 0) return 'Insufficient Data';
    
    const buyRatio = buyConditions / totalConditions;
    if (buyRatio >= 0.75) return 'Buy';
    if (buyRatio >= 0.5) return 'Hold';
    return 'Sell';
}

// Function to generate the report
async function generateReport() {
    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = '<h2>Generating report...</h2>';

    const allStocks = [...usStocks, ...canadianStocks];
    const reportData = [];

    let apiCallsMade = 0;
    const API_CALL_LIMIT = 25;

    for (const stock of allStocks) {
        reportDiv.innerHTML = `<h2>Generating report... (${stock.symbol})</h2>`;
        
        let stockData;
        
        // Check if we have cached data
        const cachedData = localStorage.getItem(`av_${stock.symbol}`);
        if (cachedData) {
            stockData = JSON.parse(cachedData).data;
            console.log(`Using cached Alpha Vantage data for ${stock.symbol}`);
        } else if (apiCallsMade < API_CALL_LIMIT) {
            // If no cached data and we haven't reached the API limit, fetch new data
            stockData = await fetchStockData(stock.symbol);
            apiCallsMade++;
            console.log(`Alpha Vantage API call made for ${stock.symbol}. Total calls: ${apiCallsMade}`);
        } else {
            console.log(`Alpha Vantage API call limit reached. Skipping data fetch for ${stock.symbol}`);
        }
        
        if (stockData) {
            const recommendation = generateRecommendation(stockData);
            
            reportData.push({
                name: stock.name,
                symbol: stock.symbol,
                peRatio: stockData.PERatio || 'N/A',
                pegRatio: stockData.PEGRatio || 'N/A',
                psRatio: stockData.PriceToSalesRatioTTM || 'N/A',
                dividendYield: stockData.DividendYield ? (parseFloat(stockData.DividendYield) * 100).toFixed(2) + '%' : 'N/A',
                operatingMargin: stockData.OperatingMarginTTM ? (parseFloat(stockData.OperatingMarginTTM) * 100).toFixed(2) + '%' : 'N/A',
                recommendation: recommendation
            });
        } else {
            reportData.push({
                name: stock.name,
                symbol: stock.symbol,
                peRatio: 'N/A',
                pegRatio: 'N/A',
                psRatio: 'N/A',
                dividendYield: 'N/A',
                operatingMargin: 'N/A',
                recommendation: 'Data Unavailable'
            });
        }

        // Only delay if we actually made an API call
        if (apiCallsMade > 0 && apiCallsMade < API_CALL_LIMIT) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between API calls
        }
    }

    displayReport(reportData, apiCallsMade);
}

// Function to display the report
function displayReport(reportData, apiCallsMade) {
    let tableHtml = `
        <table>
            <tr>
                <th>Name</th>
                <th>Symbol</th>
                <th>P/E</th>
                <th>PEG</th>
                <th>P/S</th>
                <th>Div Yield</th>
                <th>Op Margin</th>
                <th>Rec</th>
            </tr>
    `;

    reportData.forEach(stock => {
        tableHtml += `
            <tr>
                <td>${stock.name}</td>
                <td>${stock.symbol}</td>
                <td>${stock.peRatio}</td>
                <td>${stock.pegRatio}</td>
                <td>${stock.psRatio}</td>
                <td>${stock.dividendYield}</td>
                <td>${stock.operatingMargin}</td>
                <td>${stock.recommendation}</td>
            </tr>
        `;
    });

    tableHtml += '</table>';

    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = tableHtml;
    reportDiv.innerHTML += `<p>API calls made: ${apiCallsMade}</p>`;
}

// Event listener for generate report button
document.getElementById('generateReport').addEventListener('click', generateReport);

// Populate stock list
const stockListDiv = document.getElementById('stockList');
stockListDiv.innerHTML = `
    <h3>U.S. Stocks</h3>
    <ul>${usStocks.map(stock => `<li>${stock.name} (${stock.symbol})</li>`).join('')}</ul>
    <h3>Canadian Stocks</h3>
    <ul>${canadianStocks.map(stock => `<li>${stock.name} (${stock.symbol})</li>`).join('')}</ul>
`;

// Add a button to clear the cache
const clearCacheButton = document.createElement('button');
clearCacheButton.textContent = 'Clear Cached Data';
clearCacheButton.onclick = function() {
    localStorage.clear();
    alert('Cached data cleared');
};
document.body.appendChild(clearCacheButton);
