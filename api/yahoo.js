export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });
  try {
    const ticker = query.toUpperCase().trim();
    const [chartRes, summaryRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&range=1y`, { headers: { "User-Agent": "Mozilla/5.0" } }),
      fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail,defaultKeyStatistics,financialData,price`, { headers: { "User-Agent": "Mozilla/5.0" } }),
    ]);
    const chartJson = await chartRes.json();
    const summaryJson = await summaryRes.json();
    const meta = chartJson?.chart?.result?.[0]?.meta || {};
    const timestamps = chartJson?.chart?.result?.[0]?.timestamp || [];
    const closes = chartJson?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const sd = summaryJson?.quoteSummary?.result?.[0]?.summaryDetail || {};
    const ks = summaryJson?.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};
    const fd = summaryJson?.quoteSummary?.result?.[0]?.financialData || {};
    const pr = summaryJson?.quoteSummary?.result?.[0]?.price || {};
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const priceHistory = [];
    for (let i = 0; i < timestamps.length; i++) {
      const d = new Date(timestamps[i] * 1000);
      const key = `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      if (closes[i] && isFinite(closes[i])) priceHistory.push({ date: key, price: Math.round(closes[i] * 100) / 100 });
    }
    res.status(200).json({
      ticker: meta.symbol || ticker, exchange: meta.exchangeName || "", currency: meta.currency || "USD",
      currentPrice: meta.regularMarketPrice || 0,
      weekRange52: `${sd.fiftyTwoWeekLow?.raw || 0} - ${sd.fiftyTwoWeekHigh?.raw || 0}`,
      marketCap: pr.marketCap?.fmt || "", pe: sd.trailingPE?.fmt || "", eps: ks.trailingEps?.fmt || "",
      beta: sd.beta?.fmt || "", dividendYield: sd.dividendYield?.fmt || "N/A",
      evEbitda: ks.enterpriseToEbitda?.fmt || "", ebitdaMargin: fd.ebitdaMargins?.fmt || "",
      revenueGrowth: fd.revenueGrowth?.fmt || "", priceHistory,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
