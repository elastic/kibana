# OpenSpec: Alert Triage Approach Comparison

## Objective

Compare two alert triage strategies using the **same** alert dataset on separate Elastic clusters:

| | **Alert Grouping** (this feature) | **Triage Prompt** (sequential LLM agent) |
|---|---|---|
| **Paradigm** | Batch → group → per-case AD | Sequential, one alert at a time |
| **Grouping** | Deterministic clustering (host, time, MITRE, process tree) + optional LLM | LLM decides case membership per alert |
| **Context gathering** | Automatic entity extraction, cross-host correlation | LLM-driven ES|QL queries per alert (process tree, network, registry, files) |
| **Classification** | Rule-based (MITRE tactic distribution) or LLM per cluster | LLM per alert (benign / unknown / malicious, 0–100 score) |
| **Case creation** | Auto-create cases from clusters, bulk-attach alerts | LLM creates/joins cases via case manager tooling |
| **Attack narrative** | Per-case Attack Discovery (full chain) | LLM writes summary per case, can include IOCs |
| **Noise handling** | AD rejection loop: detach + re-queue rejected alerts | Implicit: LLM may classify noise as benign |
| **LLM dependency** | Steps 1–7, 9–11 work without LLM; only Step 8 (AD) needs it | Every alert requires LLM for context gathering + classification |

---

## Alert Dataset

**48 alerts** across 3 hosts and 4 attack patterns, produced by 13 Elastic prebuilt detection rules:

### Host-1 (`patryk-defend-367602-1`) — 25 alerts

| Attack Pattern | Rules Triggered | Alerts | MITRE Tactics |
|---|---|---|---|
| Credential Theft | Shadow File Read, /proc/maps Discovery, SSH Password Grabbing via strace | 4 | Credential Access, Discovery, Persistence |
| Lateral Movement | Reverse Shell Activity via Terminal | 16 | Execution (port scanning, SCP to host-2) |
| Persistence + Evasion | Cron Job Created, Executable Bit Set for Persistence, Process Backgrounded | 5 | Persistence, Privilege Escalation, Defense Evasion, Execution |

### Host-1 — Round 3 additions (8 alerts)

| Attack Pattern | Rules Triggered | Alerts | MITRE Tactics |
|---|---|---|---|
| Defense Evasion | Timestomping, Base64 Decoded Payload | 4 | Defense Evasion, Execution |
| More Lateral + Reverse Shells | Reverse Shell Activity via Terminal | 4 | Execution |

### Host-2 (`patryk-defend-367602-2`) — 8 alerts

| Attack Pattern | Rules Triggered | Alerts | MITRE Tactics |
|---|---|---|---|
| Discovery + Collection | Sensitive Files Compression, Shadow File Read, IMDS API Request, Network Connections Discovery | 8 | Credential Access, Collection, Discovery |

### Host-9 (stray) — 1 alert

| Rule | Alerts | Tactic |
|---|---|---|
| SSH Password Grabbing via strace | 1 | Credential Access, Persistence |

### Key Relationships (ground truth for evaluation)

1. **Host-1 Credential Theft** and **Host-1 Lateral Movement** are **the same attack chain** — the attacker stole credentials then moved laterally to host-2
2. **Host-2 Discovery/Collection** is a **separate operation** — independent recon activity on the target host
3. **Host-1 Persistence/Evasion** alerts are **a separate operation** — establishing backdoors after initial compromise
4. **Host-1 Round 3 Defense Evasion** (timestomping, base64 payloads) is **a third distinct operation** on the same host
5. **16 Reverse Shell alerts** are **noise** — SSH session artifacts misclassified by the detection rule, not actual reverse shells
6. **Host-1 → Host-2 link** exists via: SCP of `/etc/shadow` to `root@patryk-defend-367602-2:/tmp/.lateral_creds` and port scanning host-2

---

## Reproduction Script

`scripts/recreate_demo_alerts.ts` — TypeScript (Node.js, zero external deps) script that injects 48 alert documents into a target cluster's `.alerts-security.alerts-*` index with:

- Adjusted timestamps (shifted to "now" while preserving relative ordering)
- New unique alert IDs (to avoid collisions)
- Configurable host name remapping (default keeps original names)
- Open workflow status + no `llm-triaged` tag (ready for both approaches)
- Cleanup mode to remove previously injected alerts

Usage:
```bash
# Inject (timestamps shifted to now)
npx tsx scripts/recreate_demo_alerts.ts \
  --es-url https://target-cluster:9243 \
  --api-key <base64_api_key>

# With host renaming
npx tsx scripts/recreate_demo_alerts.ts \
  --es-url https://target-cluster:9243 \
  --api-key <base64_api_key> \
  --host-map 'patryk-defend-367602-1=host-a,patryk-defend-367602-2=host-b'

# Cleanup
npx tsx scripts/recreate_demo_alerts.ts \
  --es-url https://target-cluster:9243 \
  --api-key <base64_api_key> --cleanup
```

---

## Comparison Methodology

### Phase 1: Setup (identical on both clusters)

1. Run `recreate_demo_alerts.ts` on both clusters → 48 identical alerts
2. Run `recreate_endpoint_events.ts` on both clusters → matching endpoint event logs (process, network, file, registry) so the triage prompt's context-gathering queries return realistic data
3. Verify alert counts match: `GET .alerts-security.alerts-*/_count`
4. LLM connector: **Claude 4.5 Sonnet** — same model on both clusters

### Phase 2: Run Alert Grouping (Cluster A)

1. Trigger: `POST /api/security/alert_grouping/workflow/{id}/_run`
2. Record:
   - Wall-clock time for the grouping pipeline
   - Number of cases created
   - Alerts per case
   - Cross-host links detected
3. For each case, trigger AD: `POST /api/security/alert_grouping/cases/{id}/_generate_attack_discovery`
4. Record:
   - AD generation time per case
   - LLM token usage (input + output tokens)
   - Number of alerts kept vs. rejected per case
   - Attack narrative quality (see scoring rubric below)
5. Run Round 2 (rejected alerts re-processed)
6. Record same metrics

### Phase 3: Run Triage Prompt (Cluster B)

1. Run `scripts/triage_runner.ts` → process each alert sequentially using the triage prompt workflow
2. For each alert, the LLM agent:
   - Checks existing cases for matching entities
   - Gathers context (ES|QL queries for process tree, network, registry, files)
   - Classifies (benign / unknown / malicious)
   - Creates or updates a case
   - Acknowledges the alert
3. Record:
   - Wall-clock time per alert (context gathering + classification + case ops)
   - Total LLM token usage per alert (all context queries + classification + case creation)
   - Number of cases created
   - Classification accuracy (see ground truth above)
   - Whether lateral movement was detected

**Note**: The triage prompt does **not** run Attack Discovery per case after processing. Cases contain the LLM-generated summary and classification only.

### Phase 4: After Both Complete

1. Extract all cases from both clusters
2. Map each case to ground truth attack patterns
3. Score using the rubric below

### Phase 5: Scale Test (500+ alerts)

1. Duplicate the 48-alert dataset ~10× with varied timestamps and host names → ~500 alerts
2. Run both approaches on the scaled dataset
3. Record same metrics as Phases 2–3 to measure scaling behavior
4. Key questions: Does alert grouping batch efficiency grow with scale? Does triage prompt latency grow linearly?

---

## Evaluation Rubric

### 1. Grouping Accuracy (0–100)

| Criterion | Points | How to Score |
|---|---|---|
| Credential Theft alerts (host-1) grouped together | 20 | All 4 in same case = 20, split = partial |
| Reverse Shell noise separated from real attacks | 20 | Noise in separate case or rejected = 20 |
| Host-2 recon separated from host-1 attacks | 15 | In distinct case = 15 |
| Lateral movement link detected (host-1 → host-2) | 20 | Explicitly mentioned in case/AD = 20 |
| Persistence alerts grouped correctly | 15 | Distinct case or sub-group = 15 |
| Round 3 defense evasion identified separately | 10 | Distinct case = 10 |

### 2. Attack Narrative Quality (0–100)

| Criterion | Points | How to Score |
|---|---|---|
| Correct MITRE tactics identified | 20 | All relevant tactics mentioned = 20 |
| Specific IOCs cited (file paths, IPs, processes) | 20 | 3+ specific IOCs = 20 |
| Attack chain order preserved (recon → access → movement → persist) | 20 | Correct chronological order = 20 |
| Lateral movement direction correct (host-1 → host-2) | 15 | Direction + method (SCP, port scan) = 15 |
| Noise correctly excluded from narrative | 15 | SSH artifacts excluded = 15 |
| Actionable remediation steps | 10 | Specific remediation mentioned = 10 |

### 3. Efficiency Metrics

| Metric | Alert Grouping | Triage Prompt | Lower is Better? |
|---|---|---|---|
| Total wall-clock time | Σ(pipeline time + AD time per case) | Σ(time per alert) | Yes |
| Total LLM tokens (input) | Count across all AD calls | Count across all context + classify calls | Yes |
| Total LLM tokens (output) | Count across all AD calls | Count across all case creation + classify calls | Yes |
| LLM calls | N (one per case with alerts) | 48 × M (M = avg calls per alert for context) | Yes |
| Human intervention needed | Count of manual corrections | Count of manual corrections | Yes |

### 4. Classification Accuracy (Triage Prompt specific)

| Ground Truth | Expected Classification | Score |
|---|---|---|
| Credential Theft alerts | Malicious (70–100) | Correct if malicious |
| Reverse Shell noise | Benign (0–19) or Unknown (20–60) | Correct if not malicious |
| Lateral Movement alerts | Malicious (75+) | Correct if malicious |
| Discovery/Collection (host-2) | Unknown (30–60) or Malicious (61–80) | Either acceptable |
| Persistence alerts | Malicious (65+) | Correct if malicious |

---

## Expected Hypotheses

### H1: Alert Grouping produces higher-quality per-case narratives

**Rationale**: By pre-grouping related alerts, AD receives focused input (5–25 related alerts) instead of processing alerts in isolation. This should yield richer attack chain narratives with better lateral movement detection.

### H2: Alert Grouping uses fewer total LLM tokens

**Rationale**: Alert Grouping makes ~3–6 LLM calls (one AD per case). Triage Prompt makes 47+ calls (context queries + classification per alert). Even though individual AD calls are larger, total token usage should be lower.

### H3: Triage Prompt produces more granular per-alert classifications

**Rationale**: Processing alerts individually with deep context gathering (process trees, network events, registry) should yield more accurate benign/unknown/malicious scores per alert, though at higher cost.

### H4: Alert Grouping handles noise better at scale

**Rationale**: The rejection loop (AD rejects noise → re-queue → re-group) systematically filters noise across rounds. The triage prompt approach handles noise per alert (may classify as benign) but doesn't benefit from seeing the full cluster context.

### H5: Combined approach would be optimal

**Rationale**: Alert Grouping for initial clustering + Triage Prompt-style deep context gathering per case (not per alert) could combine the best of both — batch efficiency with investigation depth.

---

## Deliverables

### Scripts (all TypeScript, zero external deps — run via `npx tsx`)

| # | Script | Purpose | Status |
|---|---|---|---|
| 1 | `scripts/es_client.ts` | Shared ES/Kibana HTTP client, bulk inject, argument parsing | ✅ Done |
| 2 | `scripts/recreate_demo_alerts.ts` | Alert injection (48 alerts, time-shift, host remap, cleanup) | ✅ Done |
| 3 | `scripts/recreate_endpoint_events.ts` | Endpoint event injection (2141 process/network/file events) | ✅ Done |
| 4 | `scripts/triage_runner.ts` | Sequential triage prompt workflow (fetch → context → LLM classify → case → acknowledge) | ✅ Done |
| 5 | `scripts/scale_dataset_generator.ts` | Multiply 48-alert dataset to 500+ alerts with varied hosts/timestamps | ✅ Done |
| 6 | `scripts/collect_metrics.ts` | Extract cases, AD results, token usage, alert stats from cluster | ✅ Done |

### Data Files

| # | File | Contents | Status |
|---|---|---|---|
| 7 | `scripts/alert_dataset.ndjson` | 48 exported alert documents | ✅ Done |
| 8 | `scripts/endpoint_events_dataset.ndjson` | 2141 endpoint events (2000 process + 114 network + 27 file) | ✅ Done |

### Analysis (to be generated after running comparison)

| # | Deliverable | Status |
|---|---|---|
| 9 | Results spreadsheet — side-by-side metrics for both approaches | ⏳ Pending |
| 10 | Narrative comparison — same attack pattern, both approach outputs, quality delta | ⏳ Pending |
| 11 | Recommendations — which approach (or hybrid) works best for which use case | ⏳ Pending |

---

## Decisions

1. **AD per case for triage prompt?** No — the triage prompt produces its own per-alert classification and case summary. Adding AD on top would conflate the two approaches.
2. **Endpoint event availability for context gathering?** Export and inject the relevant `logs-endpoint.events.*` documents (process, network, file, registry) alongside the alerts via `scripts/recreate_endpoint_events.ts`. If source events are unavailable, generate synthetic endpoint events matching the alert patterns as a fallback.
3. **LLM model?** Both approaches use the same model: **Claude 4.5 Sonnet** (Bedrock). No cross-model comparison in the initial round.
4. **Scale test?** Yes — after the 48-alert baseline comparison, run both approaches against a 500+ alert dataset (generated via `scripts/scale_dataset_generator.ts`) to measure scaling behavior.
