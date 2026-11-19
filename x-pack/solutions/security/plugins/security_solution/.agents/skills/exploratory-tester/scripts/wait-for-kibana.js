// Polls Kibana on 127.0.0.1:5620 until it reports 'available'. Exits 0 on success, 1 after 10 min.
//
// Uses the literal IPv4 loopback address rather than "localhost": Scout's
// Kibana binds to 127.0.0.1 only (no IPv6 listener), and Node's fetch
// (undici) resolves "localhost" to ::1 first with no automatic IPv4
// fallback on some Node/OS combinations, unlike curl's happy-eyeballs
// behavior used elsewhere in this skill. Using "localhost" here silently
// retries via ECONNREFUSED-on-::1 for the entire timeout even once Kibana
// is actually up and reachable on 127.0.0.1.
(async () => {
  const creds = Buffer.from('elastic:changeme').toString('base64');
  for (let i = 1; i <= 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:5620/api/status',
        { headers: { Authorization: 'Basic ' + creds } });
      const s = await r.json();
      if (s?.status?.overall?.level === 'available') {
        process.stdout.write('Kibana ready\n'); process.exit(0);
      }
    } catch(e) { /* retry */ }
    process.stdout.write('Attempt ' + i + ' — waiting 10s...\n');
    await new Promise(r => setTimeout(r, 10000));
  }
  process.stderr.write('Kibana not ready after 10 minutes\n'); process.exit(1);
})();
