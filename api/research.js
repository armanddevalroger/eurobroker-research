export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { query, yahooData } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query" });
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const hasReal = yahooData && yahooData.currentPrice > 0;
  const priceHistoryJSON = hasReal && yahooData.priceHistory?.length > 0
    ? yahooData.priceHistory.map(p => `{"date":"${p.date}","price":${p.price}}`).join(",")
    : '{"date":"Jan 24","price":0}';

  const prompt = `Generate a detailed equity research note for ${query}. Return ONLY valid JSON, no markdown, no code fences.
${hasReal ? `IMPORTANT - Use these EXACT real market values:
- ticker: "${yahooData.ticker}", exchange: "${yahooData.exchange}", currency: "${yahooData.currency}"
- currentPrice: ${yahooData.currentPrice} (USE THIS EXACT NUMBER)
- weekRange52: "${yahooData.weekRange52}", marketCap: "${yahooData.marketCap}"
- beta: "${yahooData.beta}", dividendYield: "${yahooData.dividendYield}"
- trailingPE: "${yahooData.pe}", eps: "${yahooData.eps}"
- ebitdaMargin: "${yahooData.ebitdaMargin}", evEbitda: "${yahooData.evEbitda}"
priceTarget: realistic analyst target vs currentPrice of ${yahooData.currentPrice} ${yahooData.currency}.
upside: ((priceTarget-${yahooData.currentPrice})/${yahooData.currentPrice}*100) rounded 1 decimal.` : ''}
ESG scores: integers 0-100 only, never decimals or out of 10.
executiveSummary: 5-6 sentences covering business model, competitive advantages, growth drivers, risks, valuation.
thesisPoints: 3-4 sentences each with specific data, market context, financial implications.
pe/evEbitda in forecasts: use dot as decimal separator (e.g. "18.5" not "18,5").

Return this exact JSON:
{"company":string,"ticker":string,"exchange":string,"sector":string,"country":string,"rating":"BUY"|"HOLD"|"SELL","currentPrice":number,"priceTarget":number,"currency":string,"marketCap":string,"weekRange52":string,"upside":string,"executiveSummary":string,"metrics":{"revenue":string,"revenueYoY":string,"ebitdaMargin":string,"ebitdaMarginYoY":string,"netIncome":string,"netIncomeYoY":string,"eps":string,"epsYoY":string,"pe":string,"evEbitda":string,"dividendYield":string,"beta":string},"thesisPoints":[{"title":string,"body":string},{"title":string,"body":string},{"title":string,"body":string}],"forecasts":[{"year":"FY2023A","revenue":number,"revenueGrowth":string,"ebitda":number,"ebitdaMargin":string,"netIncome":number,"eps":number,"dps":number,"pe":string,"evEbitda":string},{"year":"FY2024A","revenue":number,"revenueGrowth":string,"ebitda":number,"ebitdaMargin":string,"netIncome":number,"eps":number,"dps":number,"pe":string,"evEbitda":string},{"year":"FY2025E","revenue":number,"revenueGrowth":string,"ebitda":number,"ebitdaMargin":string,"netIncome":number,"eps":number,"dps":number,"pe":string,"evEbitda":string},{"year":"FY2026E","revenue":number,"revenueGrowth":string,"ebitda":number,"ebitdaMargin":string,"netIncome":number,"eps":number,"dps":number,"pe":string,"evEbitda":string},{"year":"FY2027E","revenue":number,"revenueGrowth":string,"ebitda":number,"ebitdaMargin":string,"netIncome":number,"eps":number,"dps":number,"pe":string,"evEbitda":string}],"valuationNote":string,"peers":[{"name":string,"ticker":string,"mktCap":string,"pe":string,"evEbitda":string,"revenueGrowth":string,"ebitdaMargin":string,"rating":string},{"name":string,"ticker":string,"mktCap":string,"pe":string,"evEbitda":string,"revenueGrowth":string,"ebitdaMargin":string,"rating":string},{"name":string,"ticker":string,"mktCap":string,"pe":string,"evEbitda":string,"revenueGrowth":string,"ebitdaMargin":string,"rating":string}],"swot":{"strengths":[string,string,string],"weaknesses":[string,string,string],"opportunities":[string,string,string],"threats":[string,string,string]},"catalysts":[{"date":string,"description":string},{"date":string,"description":string},{"date":string,"description":string}],"risks":[{"level":"High"|"Medium"|"Low","description":string},{"level":"High"|"Medium"|"Low","description":string},{"level":"High"|"Medium"|"Low","description":string}],"esg":{"environmental":{"score":number,"comment":string},"social":{"score":number,"comment":string},"governance":{"score":number,"comment":string}},"news":[{"date":string,"headline":string,"context":string},{"date":string,"headline":string,"context":string}],"ratingHistory":[{"date":string,"rating":string,"priceTarget":number,"sharePrice":number},{"date":string,"rating":string,"priceTarget":number,"sharePrice":number}],"priceHistory":[${priceHistoryJSON}],"priceEvents":[{"date":string,"event":string},{"date":string,"event":string}]}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) return res.status(500).json({ error: await response.text() });
  const result = await response.json();
  res.status(200).json({ text: result.content[0].text, priceHistory: yahooData?.priceHistory || [] });
}
