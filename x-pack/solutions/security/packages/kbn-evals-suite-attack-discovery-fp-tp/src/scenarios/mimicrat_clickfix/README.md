# mimicrat-clickfix scenario

A replay of the MIMICRAT ClickFix chain from [Elastic Security Labs](https://www.elastic.co/security-labs/threat-command/mimicrat-custom-rat-mimics-c2-frameworks), ported from the `tp-chains` corpus in [#293023](https://github.com/elastic/kibana/pull/293023).

On `WS-FIN-214`, `j.meyer` pastes an obfuscated PowerShell one-liner into the Run dialog (`explorer.exe` is the parent). It fetches a second stage from `xMRi.network`, sets `amsiInitFailed` through reflection, writes `zbuild.exe` to a random ProgramData folder and starts it. `zbuild.exe` then beacons to `d15mawx0xveem1.cloudfront.net` and posts to `/discover/pcversion/metrics`. Four alerts cover the four stages, and one authored Attack Discovery cites them.

## Examples

Each example declares the result each world check should reach (`checks`). Its gold is what the workflow's verdict rules give for those results (`deriveFpTpOutcome`), and `registry.test.ts` fails if they disagree. Check results are listed as entity role / process parent / network destination.

| Example | Situation | World | Checks | Gold |
| --- | --- | --- | --- | --- |
| `tp` | U6 | The replay | supports / supports / supports | `true_positive` |
| `tp-entities-missing` | U6 | No entity records | skipped / supports / supports | `true_positive` |
| `tp-events-missing` | U6 | No raw events | supports / skipped / skipped | `inconclusive` |
| `tp-network-only` | U6 | No parent recorded for either process | supports / neutral / supports | `true_positive` |
| `drop-one-redundant` | U6 | The exfil POST is gone; the check-in still shows the C2 | supports / supports / supports | `true_positive` |
| `drop-one-sole-evidence` | U3 | The AMSI-bypass event, its stage's only evidence, is gone | supports / supports / supports | `true_positive` (provisional) |
| `fp-benign-mimic` | U1 | SCCM distribution point, `CcmExec.exe` running compliance scripts and a cached package, Microsoft management destinations | contradicts / contradicts / contradicts | `false_positive` |
| `fp-network-only` | U4 | Benign activity with no entity role, no parents, management destinations | neutral / neutral / contradicts | `false_positive` |
| `fp-entities-missing` | U1 | Benign mimic without entity records | skipped / contradicts / contradicts | `inconclusive` |
| `fp-events-missing` | U1 | Benign mimic without raw events | contradicts / skipped / skipped | `inconclusive` |
| `domain-swap` | U4 | The cradle, the stage-2 download and the C2 go to Microsoft management services | supports / supports / contradicts | `inconclusive` |
| `role-swap-sccm` | U2 | The host is an SCCM distribution point | contradicts / supports / supports | `inconclusive` |
| `role-swap-mdm` | U2 | The host is an Intune provisioning host | contradicts / supports / supports | `inconclusive` |
| `parent-spoof` | U1 | The Intune management extension starts PowerShell | supports / contradicts / supports | `inconclusive` |
| `all-neutral` | U5 | No entity role, no parents, no network events | neutral / neutral / neutral | `inconclusive` |
| `tp-host-name-only` | U6 | Cited alerts carry `host.name` but no `host.id` | supports / supports / supports | `true_positive` |
| `tp-multiday-span` | U6 | Cited-alert `original_time` and each stage's raw events spread across three days, so every branch window holds its own stage (2 / 1 / 2 / 2) | supports / supports / supports | `true_positive` |
| `fp-multiday-span-truncated` | U1 | Same retimed 3-day span (every branch holds its stage: 1 / 2 / 2 / 2), plus 60 benign service starts inside only the FIRST cited alert's window — that branch sees 62 and truncates | — (no checks; the rules do not model truncation) | `inconclusive` |

### The #299995 follow-up examples

`tp-host-name-only` covers the workflow's host-keying fallback: with no `host.id` on any cited alert, every per-alert branch keys on `host.name` instead, and must find the same raw events, so the gold is `tp`'s. It is a `perturbation` — the checks the rules read are unchanged.

`tp-multiday-span` and `fp-multiday-span-truncated` measure whether a multi-day cited-alert span dilutes the raw events the analysis reads — originally the oldest-first 50-event shared page, now the per-alert branch windows (10 each) this PR adopts. Both fixtures retime each STAGE's raw events with its alert (`withStageEventSpan`), so the chain is genuinely spread: every branch window holds its own stage's events (`tp-multiday-span` branches count 2 / 1 / 2 / 2) and a live run reads a dense multi-hour branch, not just the first. The span alone does not dilute: each branch's own volume stays under 10 (`tp-multiday-span`, gold `tp`). Dilution is corpus volume inside a branch window, not span width: `fp-multiday-span-truncated` places more than a branch page of benign service starts minutes after the first stage's events, inside the FIRST cited alert's ±2h window and no other's, so that branch sees 62 hits for its 10-event page (`branches_truncated` flips) while the later branches stay clean at 1 / 2 / 2. The first stage's own 2 events are the oldest in that window, so they stay on the branch's oldest-first page and are kept; the gold `inconclusive` rests on the truncation flag alone — the same downgrade as `encoded-powershell.fp-events-truncated`, reached by per-branch truncation rather than eviction off a single shared page. Under the earlier shared-page design this same fixture measured eviction: the widened 3-day window filled its one page with early benign fill and every alert-adjacent event fell off it. The follow-up that adopted per-alert windows ([AlertZero] Search FP/TP raw events per cited alert) closes the eviction gap; this example now guards the residual per-branch form — a branch whose own window holds more than 10 events reports truncation and cannot clear the attack. An earlier revision of this fixture retimed only the alerts, so branches after the first were empty (7 / 0 / 0 / 0) and the example never exercised a dense branch; `withStageEventSpan` closes that gap.

`explorer.exe` is the user's shell, so the replay's process parent supports. Examples that need a neutral parent remove the parents of both `powershell.exe` and `zbuild.exe` rather than pick a process whose reading is uncertain; with only PowerShell's removed, the analysis reads `zbuild.exe`'s parent as a user shell. The `unknown` entity role keeps the host and user records but drops their sub-type, asset, and risk, so the store answers without saying what the host is.

The benign mimic keeps the alerts and the discovery, which still make the attack's claims, but its raw events are Configuration Manager activity: compliance scripts under `C:\Windows\CCM\SystemTemp` in place of the cradle and the AMSI patch, and a package in `ccmcache` in place of the ProgramData loader. The rewrite covers every event that carries the one-liner or the loader's command line. `fp-network-only` starts from the same activity. `all-neutral` keeps the replay's content on purpose: raw events that disagree with the discovery's claims refute it, so rewriting them makes the chain read as a false positive. Command lines and file paths are not checks, so with no parent, no destination, and no role, the rules give `inconclusive` even though the content is malicious.

`tp` and `fp-benign-mimic` are also the scenario's twins for manual seeding (`--scenario mimicrat-clickfix --variant tp | fp-benign-mimic`).

## Divergences from #293023

The labels in #293023 predate the verdict rules in [security-team#19280](https://github.com/elastic/security-team/issues/19280). Re-derived under them:

- `domain-swap`: `false_positive` there, with only the C2 hop moved. That leaves `xMRi.network` supporting and Dropbox contradicting within one check, which the workflow cannot report: it returns one result per check. Here both hops, and the one-liner, go to the management destinations `fp-network-only` uses (`manage.microsoft.com`, `sccm-dp-02.corp.local`), so the destination contradicts while the parent and role support, and the gold is `inconclusive`. Dropbox is not used: a consumer file-sharing service is a gray area between vendor and staging infrastructure, so the gold would depend on how a model classifies it.
- `role-swap-sccm` and `role-swap-mdm`: `false_positive` there. A management role alone contradicts while the destinations support, so `inconclusive`. Here they change only the role; the parent stays `explorer.exe`.
- `parent-spoof`: `false_positive` there, with `msiexec.exe` running a vendor `install-deps.ps1`. An installer is not clearly a management agent, so this port uses the Intune management extension, which is. The destinations still support, so `inconclusive`.
- `drop-one-sole-evidence`: `inconclusive` there. The other stages still support, so the rules give `true_positive`. It is `provisional` until that is agreed.

## Discarded mutations

A mutation that changes no check result is discarded, not relabelled: it tests nothing the base world does not. `registry.test.ts` enforces this for every `mutation` variant against its base. The two drop-one examples are `perturbation`s of `tp` instead: they remove evidence the checks do not read, and the test requires their checks, and so their gold, to equal `tp`'s.

- `chain-reorder`: the checks ignore event order.
- `benign-payload-rename`: renaming `zbuild.exe` changes no parent, destination, or role.

## Placeholder values

The write-up does not document these, so they are made up: process ids, the stage-2 and C2 IPs (`45.13.212.250` is from the write-up, `18.245.139.12` is not), the host OS version, the user domain `CORP`, entity roles and risk scores, the benign mimic's script, package, and destinations (`manage.microsoft.com`, `sccm-dp-02.corp.local`), and the stage-2 path on `manage.microsoft.com`.
