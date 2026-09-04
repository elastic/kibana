# Forensic Watch / BlackHat demo seed

Seeds the ransomware kill chain from the BlackHat 2026 demo so Forensic Watch can reconstruct a timeline after Attack Discovery clusters the alerts.

## What gets indexed

| Layer | Index | Story |
| --- | --- | --- |
| Defend telemetry | `logs-endpoint.events.{process,file,network,registry}-default` | `WKSTN-RECV01` (phishing Outlook → encoded PowerShell → `update.dll` → C2 `185.220.101.42:443` → LSASS / SMB) → `SRV-DC01` (WMI, `Run\Updater`, `vssadmin`, `.locked`, `README_RESTORE.txt`) |
| Hunt leftover | same event indices | `WIN-FIN-03` shares the payload hash, C2, and Run-key so “other hosts affected” is true in telemetry |
| Elastic Defend alerts | `logs-endpoint.alerts-default` | Four `event.kind:alert` + `event.module:endpoint` docs along the chain (initial access, credential theft, lateral SMB, DC impact) |
| Detection Engine | `.alerts-security.alerts-<space>` | Endpoint Security rule preview copies honest alerts immediately (default `--alert-mode preview`) |

Shared IoCs:

- SHA-256 `a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10`
- C2 `185.220.101.42:443`
- Run key `HKLM\Software\Microsoft\Windows\CurrentVersion\Run\Updater` → `C:\ProgramData\svc.exe`
- Patient-zero user `r.martinez`

## Run

From `x-pack/solutions/security/plugins/security_solution`:

```bash
yarn data:seed-forensic-watch --clean
```

Or from the Kibana repo root:

```bash
node x-pack/solutions/security/plugins/security_solution/scripts/endpoint/blackhat_demo/seed_demo_data_cli.js --clean
```

Defaults: Kibana `http://127.0.0.1:5601`, Elasticsearch `http://127.0.0.1:9200`, `elastic` / `changeme`, space `default`.

## Forensic Watch path (this is the POC)

Synthetic `--attacks` **does not** emit `security.attackDiscoveryCreated`, so Watch Floor will not park a proposal. After seeding:

1. Confirm Endpoint Security alerts on `WKSTN-RECV01`.
2. Open **Attack Discovery** and click **Generate** (real LLM, AD 2.0).
3. Enable Watch Floor and Forensic Watch in the space if they are still off.
4. Approve the Floor proposal. Forensic Watch loads `endpoint-forensic-analysis` with the host from the discovery’s alerts and reconstructs the timeline.

`--attacks` is only useful if you want Attack Discovery documents to browse without going through Floor.

## Flags

| Flag | Default | Purpose |
| --- | --- | --- |
| `--clean` | off | Delete prior demo docs (by host name / demo agent id prefixes), then re-seed |
| `--clean-only` | off | Delete and exit |
| `--alert-mode` | `preview` | `preview` mints detection alerts now; `live` enables Endpoint Security; `none` skips promotion |
| `--attacks` | off | Synthetic Attack Discoveries (no Floor signal) |
| `--hours-ago` | `3` | Kill-chain start relative to now (keep inside AD’s recent-alert window) |

## Cleanup

```bash
yarn data:seed-forensic-watch --clean-only
```
