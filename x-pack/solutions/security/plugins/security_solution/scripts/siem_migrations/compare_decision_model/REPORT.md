# Decision model (Typesafe Jev) vs Opus 5.5 in the Rule Migration Graph

Run on 2026-11-13 against a local stack (Kibana + Elasticsearch connected to EIS QA), over every
rule migration rule in the `default` space: 11 rules, 8 Splunk and 3 Microsoft Sentinel.

## Question

Can the decision model replace the LLM in the two bounded decisions of the Rule Migration Graph,
choosing from the RAG candidates, without changing the outcome?

| Graph node | Decision | Candidates |
|---|---|---|
| `matchPrebuiltRule` (v1) | Which prebuilt rule, if any, matches the source rule | Up to 5 (`RETURNED_RULES`, `min_score` 40) |
| `retrieveIntegrations` | Which integration, if any, provides the rule's data | Up to 7 (`RETURNED_INTEGRATIONS`, `min_score` 7) |

Opus 5.5's answer is the reference and is assumed correct.

## Method

For each rule (`run_compare_decision_model.js`):

1. **Natural language interpretation.** QRadar and Sentinel rules use the `nl_query` the graph's
   `sourceRuleToNaturalLanguage` node generated, read from the rule's first comment. If the rule hit
   unsupported functions, that comment holds an explanation instead, and the rule has no `nl_query`,
   as in the graph. Splunk rules don't use `nl_query`.
2. **Semantic query.** `CREATE_SEMANTIC_QUERY_PROMPT`, imported from the graph and sent to Opus.
3. **RAG.** The ES queries of the integrations and prebuilt rules data clients, copied with the same
   constants. Prebuilt candidates get their latest rule asset, which supplies the `query` the graph's
   prompt shows.
4. **Decision, both models, same candidates.**
   - **Opus**: the graph's prompt, imported unchanged (`MATCH_PREBUILT_RULE_PROMPT_SPLUNK` /
     `_GENERIC`, `MATCH_INTEGRATION_PROMPT`) and rendered with the nodes' inputs. Called through
     Kibana's inference service (`/internal/inference/chat_complete`) with the graph's chat model
     options: `temperature` 0.05, `maxRetries` 1, telemetry plugin id `siem_migrations_rules`. Parsed
     with `JsonOutputParser`. A pick that isn't a candidate counts as no match, as in the graph.
   - **Jev** (`.typesafe-jev-1.13_decision`): ES `POST _inference/decision/{id}`, one `choice`
     question, in the request shape of `decide()` (elastic/kibana#303573). The same rendered prompt,
     split: the `<context>` (candidates) and rule blocks become `input`; the rest, minus the JSON
     output instructions, becomes `instructions`. Choices are the candidates plus `no_match`.
5. **Judge.** Opus decides whether Jev's answer gives the same output as the reference. The exact
   match of the two picks is recorded too.
6. **Graph routing.** The graph stops after a prebuilt match, so `retrieveIntegrations` is compared
   only when Opus found no prebuilt match.

## Results

| Node | Compared | Skipped | Judge: same | Exact match | Jev confidence, same | Jev confidence, different | p50 Opus | p50 Jev |
|---|---|---|---|---|---|---|---|---|
| `matchPrebuiltRule` | 11 | 0 | 9/11 (81.8%) | 9/11 | 0.76 | 0.80 | 6449 ms | 289 ms |
| `retrieveIntegrations` | 9 | 2 (prebuilt match) | 9/9 (100%) | 9/9 | 0.81 | n/a | 5298 ms | 269 ms |

The judge and the exact match agreed on every case.

### Disagreements

Both are on `matchPrebuiltRule`, Splunk, and follow one pattern: Opus finds no match and Jev picks a
near-miss rule.

| Rule | Opus | Jev (confidence) | Judge |
|---|---|---|---|
| Detecting Network and Port Scanning | `no_match` | Potential Port Scanning Activity from Compromised Host (0.87) | The prebuilt rule uses Linux endpoint data, groups by process and destination IP, and only detects vertical scans |
| Finding Interactive Logins From Service Accounts | `no_match` | Potential Account Takeover - Mixed Logon Types (0.74) | The prebuilt rule uses Windows 4624 logon-type volume anomalies; the Splunk rule is a first-seen check on `svc_*` accounts |

### All cases

| Rule | Vendor | `nl_query` | Node | Candidates | Status | Opus | Jev | Jev confidence | Exact | Judge | Opus ms | Jev ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Detecting Network and Port Scanning | splunk | not_needed | matchPrebuiltRule | 5 | compared | no_match | Potential Port Scanning Activity from Compromised Host | 0.87 | false | false | 11983 | 303 |
| Detecting Network and Port Scanning | splunk | not_needed | retrieveIntegrations | 7 | compared | network_traffic | network_traffic | 0.66 | true | true | 4513 | 317 |
| Brute Force with Login Success Analysis | splunk | not_needed | matchPrebuiltRule | 5 | compared | no_match | no_match | 0.94 | true | true | 5460 | 397 |
| Brute Force with Login Success Analysis | splunk | not_needed | retrieveIntegrations | 7 | compared | endpoint | endpoint | 0.91 | true | true | 6294 | 254 |
| Windows Audit Log Tampering | splunk | not_needed | matchPrebuiltRule | 5 | compared | Windows Event Logs Cleared | Windows Event Logs Cleared | 0.98 | true | true | 6404 | 229 |
| Windows Audit Log Tampering | splunk | not_needed | retrieveIntegrations | 0 | skipped_prebuilt_match | — | — | — | — | — | — | — |
| Suspicious PowerShell Commands | splunk | not_needed | matchPrebuiltRule | 5 | compared | Suspicious Windows Powershell Arguments | Suspicious Windows Powershell Arguments | 0.46 | true | true | 10764 | 278 |
| Suspicious PowerShell Commands | splunk | not_needed | retrieveIntegrations | 0 | skipped_prebuilt_match | — | — | — | — | — | — | — |
| Finding Interactive Logins From Service Accounts | splunk | not_needed | matchPrebuiltRule | 5 | compared | no_match | Potential Account Takeover - Mixed Logon Types | 0.74 | false | false | 7805 | 289 |
| Finding Interactive Logins From Service Accounts | splunk | not_needed | retrieveIntegrations | 7 | compared | endpoint | endpoint | 0.73 | true | true | 5377 | 347 |
| Brute Force Attack Detection | splunk | not_needed | matchPrebuiltRule | 5 | compared | no_match | no_match | 0.48 | true | true | 7128 | 334 |
| Brute Force Attack Detection | splunk | not_needed | retrieveIntegrations | 7 | compared | endpoint | endpoint | 0.94 | true | true | 5086 | 240 |
| Unusually Long Command Line Strings | splunk | not_needed | matchPrebuiltRule | 5 | compared | no_match | no_match | 0.98 | true | true | 5256 | 336 |
| Unusually Long Command Line Strings | splunk | not_needed | retrieveIntegrations | 7 | compared | endpoint | endpoint | 0.91 | true | true | 4878 | 270 |
| Detecting Recurring Malware on Host | splunk | not_needed | matchPrebuiltRule | 5 | compared | no_match | no_match | 0.93 | true | true | 6645 | 194 |
| Detecting Recurring Malware on Host | splunk | not_needed | retrieveIntegrations | 7 | compared | endpoint | endpoint | 0.97 | true | true | 5586 | 306 |
| Highly Sensitive Password Accessed | microsoft-sentinel | from_comment | matchPrebuiltRule | 5 | compared | no_match | no_match | 0.99 | true | true | 4966 | 226 |
| Highly Sensitive Password Accessed | microsoft-sentinel | from_comment | retrieveIntegrations | 7 | compared | lastpass | lastpass | 1.00 | true | true | 4501 | 269 |
| Detect port misuse by anomaly based detection (ASIM Network Session schema) | microsoft-sentinel | from_comment | matchPrebuiltRule | 5 | compared | no_match | no_match | 0.41 | true | true | 6449 | 238 |
| Detect port misuse by anomaly based detection (ASIM Network Session schema) | microsoft-sentinel | from_comment | retrieveIntegrations | 7 | compared | network_traffic | network_traffic | 0.47 | true | true | 5298 | 258 |
| Detect port misuse by static threshold (ASIM Network Session schema) | microsoft-sentinel | from_comment | matchPrebuiltRule | 5 | compared | no_match | no_match | 0.63 | true | true | 5950 | 305 |
| Detect port misuse by static threshold (ASIM Network Session schema) | microsoft-sentinel | from_comment | retrieveIntegrations | 7 | compared | network_traffic | network_traffic | 0.67 | true | true | 5389 | 266 |

## Findings

- **`retrieveIntegrations`: Jev matched Opus on all 9 cases**, at about 1/20 of the latency
  (p50 269 ms vs 5298 ms).
- **`matchPrebuiltRule`: Jev is looser than Opus on "no match".** The prompt asks for a match only
  when the use case is "almost identical". Both disagreements are Jev accepting a related but
  narrower or differently scoped rule.
- **Confidence does not separate Jev's wrong matches here.** The two disagreements had confidence
  0.87 and 0.74 (mean 0.80), above the mean of the agreements (0.76); several agreements were below
  0.5. On this sample a confidence threshold would not have filtered them out.
- **The `nl_query` matters for QRadar and Sentinel.** On the same 3 Sentinel rules, prebuilt
  agreement was 2/3 and 1/3 in two runs without `nl_query` (title and description only), and 3/3
  in both runs with it.

## Limits

- **11 rules, a few hand-made test migrations.** The results show the method works, not how Jev
  performs on customer migrations.
- **Opus is not deterministic.** An earlier run on the 3 Sentinel rules, without `nl_query`, gave
  different prebuilt agreement on separate runs (2/3 and 1/3). Each case was asked once.
- **The judge is Opus, the same model as the reference.** For single-pick decisions it agreed with
  the exact match on every case, so it added no information beyond the exact match here.
- **Not identical to the graph:**
  - The semantic query is regenerated by Opus per run, not the one the migration used.
  - The `nl_query` read from comments went through `cleanMarkdown`, which renames ```` ```esql ````
    and ```` ```spl ```` code fences.
  - Only v1 `matchPrebuiltRule` is compared. v2 is a tool loop.
  - `retrieveIntegrations` is compared whenever Opus finds no prebuilt match, including Splunk
    rules whose inline query is unsupported (the graph routes those straight to the translation
    result) and QRadar/Sentinel rules without `nl_query`.
- **Decision API status.** `decide()` (elastic/kibana#303573) is not merged. The ES `decision` task
  is experimental, and Jev is on EIS QA only.

## How to run

With Kibana and Elasticsearch running, the RAG indices populated (a rule migration populates them),
and the rules to compare migrated in the space:

```sh
node x-pack/solutions/security/plugins/security_solution/scripts/siem_migrations/run_compare_decision_model.js \
  --opusConnectorId .anthropic-claude-5.5-opus-chat_completion
```

Run with `--help` for the options (space, judge connector, decision endpoint, limit, output file).
Each run writes one JSONL line per rule and node, and prints the summary table.
