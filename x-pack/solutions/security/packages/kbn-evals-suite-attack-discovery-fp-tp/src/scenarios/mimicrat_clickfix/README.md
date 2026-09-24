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
| `fp-network-only` | U4 | No entity role, no parents, management destinations | neutral / neutral / contradicts | `false_positive` |
| `fp-entities-missing` | U1 | Benign mimic without entity records | skipped / contradicts / contradicts | `inconclusive` |
| `fp-events-missing` | U1 | Benign mimic without raw events | contradicts / skipped / skipped | `inconclusive` |
| `domain-swap` | U4 | The stage-2 download and the C2 go to Dropbox | supports / supports / contradicts | `inconclusive` |
| `role-swap-sccm` | U2 | The host is an SCCM distribution point | contradicts / supports / supports | `inconclusive` |
| `role-swap-mdm` | U2 | The host is an Intune provisioning host | contradicts / supports / supports | `inconclusive` |
| `parent-spoof` | U1 | The Intune management extension starts PowerShell | supports / contradicts / supports | `inconclusive` |
| `all-neutral` | U5 | No entity role, no parents, no network events | neutral / neutral / neutral | `inconclusive` |

`explorer.exe` is the user's shell, so the replay's process parent supports. Examples that need a neutral parent remove the parents of both `powershell.exe` and `zbuild.exe` rather than pick a process whose reading is uncertain; with only PowerShell's removed, the analysis reads `zbuild.exe`'s parent as a user shell. The `unknown` entity role keeps the host and user records but drops their sub-type, asset, and risk, so the store answers without saying what the host is.

The benign mimic keeps the alerts and the discovery, which still make the attack's claims, but its raw events are Configuration Manager activity: compliance scripts under `C:\Windows\CCM\SystemTemp` in place of the cradle and the AMSI patch, and a package in `ccmcache` in place of the ProgramData loader.

`tp` and `fp-benign-mimic` are also the scenario's twins for manual seeding (`--scenario mimicrat-clickfix --variant tp | fp-benign-mimic`).

## Divergences from #293023

The labels in #293023 predate the verdict rules in [security-team#19280](https://github.com/elastic/security-team/issues/19280). Re-derived under them:

- `domain-swap`: `false_positive` there, with only the C2 hop moved. That leaves `xMRi.network` supporting and Dropbox contradicting within one check, which the workflow cannot report: it returns one result per check. Here both hops go to Dropbox, so the destination contradicts while the parent and role support, and the gold is `inconclusive`.
- `role-swap-sccm` and `role-swap-mdm`: `false_positive` there. A management role alone contradicts while the destinations support, so `inconclusive`. Here they change only the role; the parent stays `explorer.exe`.
- `parent-spoof`: `false_positive` there, with `msiexec.exe` running a vendor `install-deps.ps1`. An installer is not clearly a management agent, so this port uses the Intune management extension, which is. The destinations still support, so `inconclusive`.
- `drop-one-sole-evidence`: `inconclusive` there. The other stages still support, so the rules give `true_positive`. It is `provisional` until that is agreed.

## Discarded mutations

A mutation that changes no check result is discarded, not relabelled: it tests nothing the base world does not. `registry.test.ts` enforces this for every example with a `mutation`. The two drop-one examples are `perturbation`s instead: they remove evidence the checks do not read, and the test requires their checks, and so their gold, to equal `tp`'s.

- `chain-reorder`: the checks ignore event order.
- `benign-payload-rename`: renaming `zbuild.exe` changes no parent, destination, or role.

## Placeholder values

The write-up does not document these, so they are made up: process ids, the stage-2 and C2 IPs (`45.13.212.250` is from the write-up, `18.245.139.12` is not), the host OS version, the user domain `CORP`, entity roles and risk scores, the benign mimic's script, package, and destinations (`manage.microsoft.com`, `sccm-dp-02.corp.local`), and the Dropbox IPs.
