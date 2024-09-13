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
    {symbol: 'ATD.TO', name: 'Alimentation Couche-Tard'},
    {symbol: 'SU.TO', name: 'Suncor Energy'},
    {symbol: 'MFC.TO', name: 'Manulife Financial'},
    {symbol: 'NTR.TO', name: 'Nutrien'},
    {symbol: 'POW.TO', name: 'Power Corporation of Canada'},
    {symbol: 'SLF.TO', name: 'Sun Life Financial'},
    {symbol: 'FFH.TO', name: 'Fairfax Financial'},
    {symbol: 'WN.TO', name: 'George Weston Limited'},
    {symbol: 'XIU.TO', name: 'iShares S&P/TSX 60 Index ETF'}
];

// Function to fetch US stock data from Alpha Vantage
async function fetchUSStockData(stock) {
    console.log(`Attempting to fetch Alpha Vantage data for ${stock.symbol}`);
    
    const cachedData = localStorage.getItem(`av_${stock.symbol}`);
    if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (new Date().getTime() - parsedData.timestamp < 24 * 60 * 60 * 1000) {
            console.log(`Using cached Alpha Vantage data for ${stock.symbol}`);
            return parsedData.data;
        }
    }

    if (typeof config === 'undefined' || !config.alphavantageApiKey) {
        console.error('Alpha Vantage API key is not defined. Please check your config.js file.');
        return null;
    }

    const apiKey = config.alphavantageApiKey;
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${stock.symbol}&entitlement=delayed&apikey=${apiKey}`;
    
    try {
        const response = await axios.get(url);
        console.log(`Alpha Vantage response for ${stock.symbol}:`, response.data);
        
        if (response.data && Object.keys(response.data).length > 0 && !response.data.hasOwnProperty('Note')) {
            localStorage.setItem(`av_${stock.symbol}`, JSON.stringify({
                data: response.data,
                timestamp: new Date().getTime()
            }));
            return response.data;
        } else {
            console.error(`No valid data returned from Alpha Vantage for ${stock.symbol}`, response.data);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching Alpha Vantage data for ${stock.symbol}:`, error);
        return null;
    }
}

// Function to fetch Canadian stock data from Yahoo Finance
async function fetchCanadianStockData(stock) {
    console.log(`Attempting to fetch Yahoo Finance data for ${stock.symbol}`);
    
    const cachedData = localStorage.getItem(`yf_${stock.symbol}`);
    if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (new Date().getTime() - parsedData.timestamp < 24 * 60 * 60 * 1000) {
            console.log(`Using cached Yahoo Finance data for ${stock.symbol}`);
            return parsedData.data;
        }
    }

    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${stock.symbol}?modules=financialData,defaultKeyStatistics,summaryDetail`;
    
    try {
        const response = await axios.get(url);
        console.log(`Yahoo Finance response for ${stock.symbol}:`, response.data);
        
        const quoteSummary = response.data.quoteSummary.result[0];
        const stockData = {
            Symbol: stock.symbol,
            Name: stock.name,
            PERatio: quoteSummary.summaryDetail.trailingPE?.raw,
            PEGRatio: quoteSummary.defaultKeyStatistics.pegRatio?.raw,
            PriceToSalesRatioTTM: quoteSummary.summaryDetail.priceToSalesTrailing12Months?.raw,
            DividendYield: quoteSummary.summaryDetail.dividendYield?.raw,
            OperatingMarginTTM: quoteSummary.financialData.operatingMargins?.raw,
            LatestPrice: quoteSummary.financialData.currentPrice?.raw,
            Volume: quoteSummary.summaryDetail.volume?.raw
        };

        localStorage.setItem(`yf_${stock.symbol}`, JSON.stringify({
            data: stockData,
            timestamp: new Date().getTime()
        }));
        return stockData;
    } catch (error) {
        console.error(`Error fetching Yahoo Finance data for ${stock.symbol}:`, error);
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

// Function to fetch historical data
async function fetchHistoricalData(symbol, isUSStock) {
    console.log(`Fetching historical data for ${symbol}`);
    let url;
    if (isUSStock) {
        const apiKey = config.alphavantageApiKey;
        url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`;
    } else {
        url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`;
    }

    try {
        const response = await axios.get(url);
        if (isUSStock) {
            const timeSeries = response.data['Time Series (Daily)'];
            return Object.entries(timeSeries).slice(0, 30).reverse().map(([date, data]) => ({
                date,
                close: parseFloat(data['4. close'])
            }));
        } else {
            const quotes = response.data.chart.result[0].indicators.quote[0];
            const timestamps = response.data.chart.result[0].timestamp;
            return timestamps.map((time, index) => ({
                date: new Date(time * 1000).toISOString().split('T')[0],
                close: quotes.close[index]
            }));
        }
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error);
        return null;
    }
}

// Function to create a chart
function createChart(symbol, data) {
    const ctx = document.createElement('canvas');
    ctx.id = `chart-${symbol}`;
    document.getElementById('charts').appendChild(ctx);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: `${symbol} Closing Price`,
                data: data.map(d => d.close),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${symbol} - 30 Day Price History`
                }
            }
        }
    });
}

// Function to generate the report
async function generateReport() {
    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = '<h2>Generating report...</h2>';

    const allStocks = [...usStocks, ...canadianStocks];
    const reportData = [];

    let apiCallsMade = 0;
    const API_CALL_LIMIT = 25;

    // Helper function to safely format numbers
    const safeNumber = (value) => {
        if (value === null || value === undefined) return 'N/A';
        const num = parseFloat(value);
        if (isNaN(num)) return 'N/A';
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Helper function to safely format percentages
    const safePercentage = (value) => {
        if (value === null || value === undefined) return 'N/A';
        const num = parseFloat(value);
        if (isNaN(num)) return 'N/A';
        return (num * 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    };

    for (const stock of allStocks) {
        reportDiv.innerHTML = `<h2>Generating report... (${stock.symbol})</h2>`;
        
        let stockData;
        const isUSStock = !stock.symbol.endsWith('.TO');
        
        if (isUSStock) {
            stockData = await fetchUSStockData(stock);
            apiCallsMade++;
        } else {
            stockData = await fetchCanadianStockData(stock);
        }
        
        if (stockData) {
            const recommendation = generateRecommendation(stockData);

            reportData.push({
                name: stock.name,
                symbol: stock.symbol,
                peRatio: safeNumber(stockData.PERatio),
                pegRatio: safeNumber(stockData.PEGRatio),
                psRatio: safeNumber(stockData.PriceToSalesRatioTTM),
                dividendYield: safePercentage(stockData.DividendYield),
                operatingMargin: safePercentage(stockData.OperatingMarginTTM),
                latestPrice: safeNumber(stockData.LatestPrice),
                volume: stockData.Volume ? parseInt(stockData.Volume).toLocaleString() : 'N/A',
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
                latestPrice: 'N/A',
                volume: 'N/A',
                recommendation: 'Data Unavailable'
            });
        }

        // Fetch historical data and create chart
        const historicalData = await fetchHistoricalData(stock.symbol, isUSStock);
        if (historicalData) {
            createChart(stock.symbol, historicalData);
        }

        // Only delay for Alpha Vantage calls
        if (isUSStock && apiCallsMade > 0 && apiCallsMade < API_CALL_LIMIT) {
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
                <th>Latest Price</th>
                <th>Volume</th>
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
                <td>${stock.latestPrice}</td>
                <td>${stock.volume}</td>
                <td>${stock.recommendation}</td>
            </tr>
        `;
    });

    tableHtml += '</table>';

    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = tableHtml;
    reportDiv.innerHTML += `<p>Alpha Vantage API calls made: ${apiCallsMade}</p>`;
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
