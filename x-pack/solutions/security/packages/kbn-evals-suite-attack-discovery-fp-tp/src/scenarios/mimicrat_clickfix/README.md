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
| `drop-one-sole-evidence` | U6 | The AMSI-bypass event, its stage's only evidence, is gone | supports / supports / supports | `true_positive` |
| `no-bridge-tp` | U6 | Each alert has its own process ids; host and user are shared | supports / supports / supports | `true_positive` |
| `no-bridge` | U3 | Each alert has its own process ids, no parents recorded, no network events | supports / neutral / neutral | `inconclusive` |
| `fp-benign-mimic` | U1 | SCCM distribution point, `CcmExec.exe` running compliance scripts and a cached package, Microsoft management destinations | contradicts / contradicts / contradicts | `false_positive` |
| `fp-network-only` | U4 | Benign activity with no entity role, no parents, management destinations | neutral / neutral / contradicts | `false_positive` |
| `no-bridge-fp` | U3 | Benign mimic with no bridge between the alerts | contradicts / contradicts / contradicts | `false_positive` |
| `jump-box` | U4 | Benign activity on an administrative jump box, no parents, management destinations | contradicts / neutral / contradicts | `false_positive` |
| `network-only-entities-missing` | U4 | `jump-box` without entity records, so nothing marks the host as a jump box | skipped / neutral / contradicts | `inconclusive` |
| `fp-entities-missing` | U1 | Benign mimic without entity records | skipped / contradicts / contradicts | `inconclusive` |
| `fp-events-missing` | U1 | Benign mimic without raw events | contradicts / skipped / skipped | `inconclusive` |
| `domain-swap` | U4 | The cradle, the stage-2 download and the C2 go to Microsoft management services | supports / supports / contradicts | `inconclusive` |
| `role-swap-sccm` | U2 | The host is an SCCM distribution point | contradicts / supports / supports | `inconclusive` |
| `role-swap-mdm` | U2 | The host is an Intune provisioning host | contradicts / supports / supports | `inconclusive` |
| `parent-spoof` | U1 | The Intune management extension starts PowerShell | supports / contradicts / supports | `inconclusive` |
| `all-neutral` | U5 | No entity role, no parents, no network events | neutral / neutral / neutral | `inconclusive` |

`explorer.exe` is the user's shell, so the replay's process parent supports. Examples that need a neutral parent remove the parents of both `powershell.exe` and `zbuild.exe` rather than pick a process whose reading is uncertain; with only PowerShell's removed, the analysis reads `zbuild.exe`'s parent as a user shell. The `unknown` entity role keeps the host and user records but drops their sub-type, asset, and risk, so the store answers without saying what the host is.

The benign mimic keeps the alerts and the discovery, which still make the attack's claims, but its raw events are Configuration Manager activity: compliance scripts under `C:\Windows\CCM\SystemTemp` in place of the cradle and the AMSI patch, and a package in `ccmcache` in place of the ProgramData loader. The rewrite covers every event that carries the one-liner or the loader's command line. `fp-network-only` starts from the same activity. `all-neutral` keeps the replay's content on purpose: raw events that disagree with the discovery's claims refute it, so rewriting them makes the chain read as a false positive. Command lines and file paths are not checks, so with no parent, no destination, and no role, the rules give `inconclusive` even though the content is malicious.

The `no-bridge` worlds (U3) give each alert, and the raw events it cites, its own pids, parent pids, and `process.entity_id`, so no process tree or entity id joins two alerts; host and user stay shared, and the alerts still cite their own events. The command line, the executable, and the loader's file path still relate the alerts, but none of them is a bridge in the prompt's sense, and a parent that ran in another alert's events has no process event of its own. The managed prompt reads shared identifiers without a bridge as a neutral `alert_linkage`, and `alert_linkage` never decides a verdict, so the gold follows from the world checks alone: `no-bridge` keeps only the workstation role supporting (`inconclusive`), `no-bridge-tp` keeps the raw-event evidence (U6), and `no-bridge-fp` keeps the mimic's contradicting checks. What the bridge changes is the model's `alert_linkage` and `claims.alert_link`, which `ClaimGrounding` grades: a `process.entity_id` or `process.pid` link is ungrounded in these worlds.

`jump-box` (U4) is the mimic's Configuration Manager activity on an administrative jump box (`sub_type: jump_box`, `environment: management`) with no parents recorded, so the role and the management destinations explain the activity. Its gold follows the contract, where a jump box `contradicts`. The shipped prompt reads a management server, MDM, or jump box as `neutral`; under that reading the destination still contradicts alone and the outcome is the same, `false_positive`, but a model that follows the prompt reports `entity_role` as `neutral`. Under the prompt's reading `jump-box` and `fp-network-only` share all three checks; only the seeded role record differs. With no entity record (`network-only-entities-missing`) the rules give `inconclusive`, the contract's unknown role; a record without a role is `neutral`, which is `fp-network-only`.

`tp` and `fp-benign-mimic` are also the scenario's twins for manual seeding (`--scenario mimicrat-clickfix --variant tp | fp-benign-mimic`).

## Divergences from #293023

The labels in #293023 predate the verdict rules in [security-team#19280](https://github.com/elastic/security-team/issues/19280). Re-derived under them:

- `domain-swap`: `false_positive` there, with only the C2 hop moved. That leaves `xMRi.network` supporting and Dropbox contradicting within one check, which the workflow cannot report: it returns one result per check. Here both hops, and the one-liner, go to the management destinations `fp-network-only` uses (`manage.microsoft.com`, `sccm-dp-02.corp.local`), so the destination contradicts while the parent and role support, and the gold is `inconclusive`. Dropbox is not used: a consumer file-sharing service is a gray area between vendor and staging infrastructure, so the gold would depend on how a model classifies it.
- `role-swap-sccm` and `role-swap-mdm`: `false_positive` there. A management role alone contradicts while the destinations support, so `inconclusive`. Here they change only the role; the parent stays `explorer.exe`.
- `parent-spoof`: `false_positive` there, with `msiexec.exe` running a vendor `install-deps.ps1`. An installer is not clearly a management agent, so this port uses the Intune management extension, which is. The destinations still support, so `inconclusive`.
- `drop-one-sole-evidence`: `inconclusive` there, tagged U3 here at first. The other stages still support and the alerts still share PowerShell's process, so it is a true attack with one event missing: U6, `true_positive`. The missing bridge is tested by `no-bridge` instead.

## Discarded mutations

A mutation that changes no check result is discarded, not relabelled: it tests nothing the base world does not. `registry.test.ts` enforces this for every `mutation` variant against its base. The two drop-one examples and `no-bridge-tp` are `perturbation`s of `tp` instead, and `no-bridge-fp` of `fp-benign-mimic`: they change evidence the world checks do not read, and the test requires their checks, and so their gold, to equal their base's.

- `chain-reorder`: the checks ignore event order.
- `benign-payload-rename`: renaming `zbuild.exe` changes no parent, destination, or role.

## Placeholder values

The write-up does not document these, so they are made up: process ids, the stage-2 and C2 IPs (`45.13.212.250` is from the write-up, `18.245.139.12` is not), the host OS version, the user domain `CORP`, entity roles and risk scores, the benign mimic's script, package, and destinations (`manage.microsoft.com`, `sccm-dp-02.corp.local`), and the stage-2 path on `manage.microsoft.com`.
