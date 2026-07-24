// Polls Kibana on localhost:5620 until it reports 'available'. Exits 0 on success, 1 after 10 min.
(async () => {
  const creds = Buffer.from('elastic:changeme').toString('base64');
  for (let i = 1; i <= 60; i++) {
    try {
      const r = await fetch('http://localhost:5620/api/status',
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
