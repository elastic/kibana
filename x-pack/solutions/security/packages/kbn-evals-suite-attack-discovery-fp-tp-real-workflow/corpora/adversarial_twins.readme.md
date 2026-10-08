# adversarial-twins corpus

Mutations of `tp-chains` base chains. `label_provenance=adversarial-mutation` on
every case. Each `mutation_spec` names the exact broken invariant. **Rule: if a
mutation leaves all documented attack invariants intact, it is DISCARDED — never
relabelled.** 3 mutations were discarded this way (see catalog end).

## Mutation catalog (21 kept cases)

One variant per base chain per row; `type` values match `payload.mutation_spec.type`
exactly (a/b and mdm/sccm variants are distinguished in `description` only).

| type | count | label | broken invariant |
|---|---|---|---|
| `domain-swap` | 6 (a/b × 3 chains) | false_positive | documented C2 domain replaced with a legitimate SaaS domain (`api.dropbox.com` / `graph.microsoft.com`); benign SaaS destination makes the alert a benign-mimic FP |
| `entity-role-swap` | 6 (mdm/sccm × 3 chains) | false_positive | workstation replaced with a management server (MDM `mdmdaemon.exe` / SCCM `CcmExec.exe` parent); benign-administration explanation for identical process events |
| `parent-process-spoof` | 3 | false_positive | explorer.exe delivery vector replaced with msiexec.exe → vendor `install-deps.ps1`; plausible legitimate software-install ancestry |
| `chain-reorder` | 3 | inconclusive | chronological/parent-child ordering inverted; sequence is neither confirmed TP nor benign |
| `drop-link` | 3 | inconclusive | sole-evidence stage of the documented chain removed; chain incomplete |

> **Label integrity:** the FP labels above are known-contested — mutations rewrite the
> entity/parent/domain fields but retain the base chain's free-text event messages,
> which still describe the malicious behavior. See `docs/label-integrity-findings.md`
> before relying on adversarial_twins FP cases in gated metrics.

## Discarded mutations (unbroken invariants) — 3

- `benign-payload-rename` (×3, one attempted per chain): renaming the dropped
  payload filename alone (e.g. `zbuild.exe` → `builder.exe`) leaves C2 domains,
  process tree, delivery vector, and all documented techniques intact. No
  invariant broken ⇒ **discarded, not relabelled**.

Anti-cheat: all labels derive from which documented invariant the mutation breaks,
never from any model output.
