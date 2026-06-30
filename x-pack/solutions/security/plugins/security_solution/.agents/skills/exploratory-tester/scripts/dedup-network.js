/**
 * Network request duplicate detector for exploratory testing.
 *
 * Usage:
 *   1. Call browser_network_requests(static: false) — parse the output into a
 *      JSON array of {method, url} objects. Each line in the output has the form:
 *        N. [METHOD] https://... => [STATUS]
 *      Extract method (e.g. GET) and full URL (e.g. https://host/path?query).
 *
 *   2. Call browser_evaluate with this file's content, replacing /*REQUESTS* /
 *      with the JSON array:
 *
 *        browser_evaluate(function: "<file content with /*REQUESTS* / replaced>")
 *
 *      Example substitution:
 *        Replace:  )(/*REQUESTS*\/)
 *        With:     )([{"method":"GET","url":"https://host/api/foo?q=1"},
 *                     {"method":"GET","url":"https://host/api/foo?q=2"}])
 *
 * Returns: { findings: Item[] }
 *   Item: { type: 'duplicate_api_call', key: string, count: number, text: string }
 *
 * Log each item in findings[] as a Level 2 finding.
 */
((requests) => {
  const POLLING = ['/health', '/status', '/metrics', '/fleet-setup', '/api/security/me'];

  const counts = {};
  requests.forEach(r => {
    const key = r.method + ' ' + r.url.split('?')[0];
    counts[key] = (counts[key] || 0) + 1;
  });

  const findings = [];
  Object.entries(counts).forEach(([key, n]) => {
    if (n >= 2 && !POLLING.some(p => key.includes(p))) {
      findings.push({
        type: 'duplicate_api_call',
        key,
        count: n,
        text: `Duplicate API call: ${key} called ${n} times`,
      });
    }
  });

  return { findings };
})(/*REQUESTS*/)
