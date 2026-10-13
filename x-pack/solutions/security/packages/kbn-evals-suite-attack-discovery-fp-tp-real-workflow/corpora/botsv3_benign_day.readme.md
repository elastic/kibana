# botsv3-benign-day — negative-control corpus

- **Corpus file:** `corpora/botsv3-benign-day.jsonl` — 96 cases, one per 15-minute bucket of the single capture day 2018-08-20 (BOTSv3/Frothly contains only one day, hence *benign-day*, not benign-week).
- **Label semantics:** at this corpus level gold means **no_discovery_expected**. The canonical schema enum requires `label ∈ {true_positive, false_positive, inconclusive}`, so cases use `label=false_positive` with `label_provenance=replay` and gold_rationale stating the negative-control contract: any discovery/alert on this window is by definition a false positive.
- **Data:** `botsv3/benign_day/*.ndjson` (1,121,812 events) = `botsv3/ecs_ndjson/` minus events matching `botsv3/exclusion_spec.json` (C2 45.77.53.176, compromised web server 192.168.9.30, victim hosts ABUNGST-L / FYODOR-L, exfil IP 104.207.83.63, tools hdoor.exe / iexeplorer.exe, coinhive, memcached udp/11211, brewertalk.com DGA window 22:00–22:09Z). See `botsv3/EXCLUSION_COUNTS.md` for per-indicator counts (36,552 events excluded).
- **Leak verification:** grep of `benign_day/` for every indicator returns **0 hits** (hosts, IPs, tools, coinhive, in-window brewertalk, udp/11211).
- **Single-day caveat:** all 96 buckets cover the same capture day; temporal diversity is 24 h only. Do not treat as a full noise week.
- **No TP contamination:** the attack-day corpus is separate; no true-positive cases are included here, so the file contains only `false_positive` cases (validator: `cases=96 false_positive=96`).
- **Note:** Splunk EC2 hosts gacrux/mars were checked and NOT excluded — their activity (osquery, DNS, stream) is benign infrastructure telemetry with no attack indicators.

Regenerate: `python3 botsv3/make_benign_day.py` then `python3 botsv3/gen_corpus.py` then `python3 validate.py corpora/botsv3-benign-day.jsonl`.
