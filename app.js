// ... (keep the existing stock lists)

// Function to fetch stock data from Alpha Vantage
async function fetchStockData(stock) {
    console.log(`Attempting to fetch data for ${stock.symbol}`);
    
    // Check if we have cached data
    const cachedData = localStorage.getItem(`av_${stock.symbol}`);
    if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // Check if the cached data is less than 24 hours old
        if (new Date().getTime() - parsedData.timestamp < 24 * 60 * 60 * 1000) {
            console.log(`Using cached Alpha Vantage data for ${stock.symbol}`);
            return parsedData.data;
        }
    }

    // Check if config and API key are defined
    if (typeof config === 'undefined' || !config.alphavantageApiKey) {
        console.error('Alpha Vantage API key is not defined. Please check your config.js file.');
        return null;
    }

    const apiKey = config.alphavantageApiKey;
    const isUSStock = !stock.symbol.endsWith('.TRT');
    let url;
    
    if (isUSStock) {
        url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${stock.symbol}&entitlement=delayed&apikey=${apiKey}`;
    } else {
        url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stock.symbol}&apikey=${apiKey}`;
    }
    
    try {
        const response = await axios.get(url);
        console.log(`Alpha Vantage response for ${stock.symbol}:`, response.data);
        
        let processedData;
        
        if (isUSStock) {
            processedData = response.data;
        } else {
            // Process Canadian stock data
            const timeSeries = response.data['Time Series (Daily)'];
            const latestDate = Object.keys(timeSeries)[0];
            const latestData = timeSeries[latestDate];
            
            processedData = {
                Symbol: stock.symbol,
                Name: stock.name,
                LatestTradingDay: latestDate,
                Close: latestData['4. close'],
                Volume: latestData['5. volume']
            };
        }
        
        if (processedData && Object.keys(processedData).length > 0) {
            // Cache the data with a timestamp
            localStorage.setItem(`av_${stock.symbol}`, JSON.stringify({
                data: processedData,
                timestamp: new Date().getTime()
            }));
            return processedData;
        } else {
            console.error(`No valid data returned from Alpha Vantage for ${stock.symbol}`, response.data);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching Alpha Vantage data for ${stock.symbol}:`, error);
        return null;
    }
}

// Function to generate recommendations
function generateRecommendation(stockData, isUSStock) {
    if (!stockData) return 'Data Unavailable';
    
    if (isUSStock) {
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
    } else {
        // For Canadian stocks, we don't have enough data to make a recommendation
        return 'Insufficient Data for Recommendation';
    }
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
            stockData = await fetchStockData(stock);
            apiCallsMade++;
            console.log(`Alpha Vantage API call made for ${stock.symbol}. Total calls: ${apiCallsMade}`);
        } else {
            console.log(`Alpha Vantage API call limit reached. Skipping data fetch for ${stock.symbol}`);
        }
        
        const isUSStock = !stock.symbol.endsWith('.TRT');
        
        if (stockData) {
            const recommendation = generateRecommendation(stockData, isUSStock);
            
            if (isUSStock) {
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
                    latestTradingDay: stockData.LatestTradingDay || 'N/A',
                    closePrice: stockData.Close || 'N/A',
                    volume: stockData.Volume || 'N/A',
                    recommendation: recommendation
                });
            }
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
    let usTableHtml = `
        <h3>U.S. Stocks</h3>
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

    let canadianTableHtml = `
        <h3>Canadian Stocks</h3>
        <table>
            <tr>
                <th>Name</th>
                <th>Symbol</th>
                <th>Latest Trading Day</th>
                <th>Close Price</th>
                <th>Volume</th>
                <th>Rec</th>
            </tr>
    `;

    reportData.forEach(stock => {
        if (!stock.symbol.endsWith('.TRT')) {
            usTableHtml += `
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
        } else {
            canadianTableHtml += `
                <tr>
                    <td>${stock.name}</td>
                    <td>${stock.symbol}</td>
                    <td>${stock.latestTradingDay}</td>
                    <td>${stock.closePrice}</td>
                    <td>${stock.volume}</td>
                    <td>${stock.recommendation}</td>
                </tr>
            `;
        }
    });

    usTableHtml += '</table>';
    canadianTableHtml += '</table>';

    const reportDiv = document.getElementById('report');
    reportDiv.innerHTML = usTableHtml + canadianTableHtml;
    reportDiv.innerHTML += `<p>API calls made: ${apiCallsMade}</p>`;
}

// ... (keep the existing event listeners and stock list population code)
