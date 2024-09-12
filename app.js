// Stock lists
const usStocks = ['BRK-B', 'V', 'JPM', 'JNJ', 'PG', 'UNH', 'MA', 'PEP', 'WMT', 'HD'];
const canadianStocks = ['ATD.TO', 'SU.TO', 'MFC.TO', 'NTR.TO', 'POW.TO', 'SLF.TO', 'FFH.TO', 'WN.TO'];

// Function to fetch stock data from Alpha Vantage
async function fetchStockData(symbol) {
    console.log(`Attempting to fetch Alpha Vantage data for ${symbol}`);
    
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

// Function to fetch stock data from Yahoo Finance API
// Function to fetch stock data from Yahoo Finance API
async function fetchYahooStockData(symbol) {
    console.log(`Attempting to fetch Yahoo Finance data for ${symbol}`);

    // Check if we have cached data
    const cachedData = localStorage.getItem(`yf_${symbol}`);
    if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Check if the cached data is less than 24 hours old
        if (new Date().getTime() - parsedData.timestamp < 24 * 60 * 60 * 1000) {
            console.log(`Using cached Yahoo Finance data for ${symbol}`);
            return parsedData.data;
        }
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=financialData,defaultKeyStatistics,summaryDetail`;
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const url = proxyUrl + yahooUrl;

    try {
        const response = await axios.get(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const stockData = response.data.quoteSummary.result[0];
        console.log(`Yahoo Finance data for ${symbol}:`, stockData);
        
        // Extract the relevant data from Yahoo Finance response
        const data = {
            Symbol: symbol,
            Name: stockData.price?.shortName || symbol,
            PERatio: stockData.summaryDetail?.trailingPE?.raw,
            PEGRatio: stockData.defaultKeyStatistics?.pegRatio?.raw,
            PriceToSalesRatioTTM: stockData.summaryDetail?.priceToSalesTrailing12Months?.raw,
            DividendYield: stockData.summaryDetail?.dividendYield?.raw,
            DebtToEquityRatio: stockData.financialData?.debtToEquity?.raw,
            OperatingMarginTTM: stockData.financialData?.operatingMargins?.raw
        };
        
        // Cache the data
        localStorage.setItem(`yf_${symbol}`, JSON.stringify({
            data: data,
            timestamp: new Date().getTime()
        }));
        
        return data;
    } catch (error) {
        console.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
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

// Function to generate the report (Alpha Vantage version)
async function generateReport() {
    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = '<h2>Generating report...</h2>';

    const allStocks = [...usStocks, ...canadianStocks];
    const reportData = [];

    let apiCallsMade = 0;
    const API_CALL_LIMIT = 25;

    for (const symbol of allStocks) {
        reportDiv.innerHTML = `<h2>Generating report... (${symbol})</h2>`;
        
        let stockData;
        
        // Check if we have cached data
        const cachedData = localStorage.getItem(`av_${symbol}`);
        if (cachedData) {
            stockData = JSON.parse(cachedData).data;
            console.log(`Using cached Alpha Vantage data for ${symbol}`);
        } else if (apiCallsMade < API_CALL_LIMIT) {
            // If no cached data and we haven't reached the API limit, fetch new data
            stockData = await fetchStockData(symbol);
            apiCallsMade++;
            console.log(`Alpha Vantage API call made for ${symbol}. Total calls: ${apiCallsMade}`);
        } else {
            console.log(`Alpha Vantage API call limit reached. Skipping data fetch for ${symbol}`);
        }
        
        if (stockData) {
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

        // Only delay if we actually made an API call
        if (apiCallsMade > 0 && apiCallsMade < API_CALL_LIMIT) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between API calls
        }
    }

    displayReport(reportData, apiCallsMade);
}

// Function to generate the report (Yahoo Finance version)
async function generateYahooReport() {
    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = '<h2>Generating report...</h2>';

    const allStocks = [...usStocks, ...canadianStocks];
    const reportData = [];

    for (const symbol of allStocks) {
        reportDiv.innerHTML = `<h2>Generating report... (${symbol})</h2>`;
        
        const stockData = await fetchYahooStockData(symbol);
        
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
function displayReport(reportData, apiCallsMade = null) {
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
    
    if (apiCallsMade !== null) {
        reportDiv.innerHTML += `<p>API calls made: ${apiCallsMade}</p>`;
    }
}

// Event listeners for generate report buttons
document.getElementById('generateReport').addEventListener('click', generateReport);
document.getElementById('generateYahooReport').addEventListener('click', generateYahooReport);

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
