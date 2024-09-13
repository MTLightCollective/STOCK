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
        const isUSStock = !stock.symbol.endsWith('.TO');
        
        if (isUSStock) {
            stockData = await fetchUSStockData(stock);
            apiCallsMade++;
        } else {
            stockData = await fetchCanadianStockData(stock);
        }
        
        if (stockData) {
            const recommendation = generateRecommendation(stockData);
            
            // Helper function to safely format numbers
            const safeNumber = (value) => {
                const num = parseFloat(value);
                return isNaN(num) ? 'N/A' : num.toFixed(2);
            };

            reportData.push({
                name: stock.name,
                symbol: stock.symbol,
                peRatio: safeNumber(stockData.PERatio),
                pegRatio: safeNumber(stockData.PEGRatio),
                psRatio: safeNumber(stockData.PriceToSalesRatioTTM),
                dividendYield: stockData.DividendYield ? `${safeNumber(stockData.DividendYield * 100)}%` : 'N/A',
                operatingMargin: stockData.OperatingMarginTTM ? `${safeNumber(stockData.OperatingMarginTTM * 100)}%` : 'N/A',
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
