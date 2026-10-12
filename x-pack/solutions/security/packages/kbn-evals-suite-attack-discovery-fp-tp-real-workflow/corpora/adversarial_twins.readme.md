# adversarial-twins corpus

Mutations of `tp-chains` base chains. `label_provenance=adversarial-mutation` on
every case. Each `mutation_spec` names the exact broken invariant. **Rule: if a
mutation leaves all documented attack invariants intact, it is DISCARDED — never
relabelled.** 4 mutations were discarded this way (see catalog end).

## Mutation catalog (20 kept cases)

| type | per chain | label | broken invariant |
|---|---|---|---|
| `domain-swap-a` | ×3 | false_positive | documented C2 domain replaced with `api.dropbox.com`; benign SaaS destination makes the alert a benign-mimic FP |
| `domain-swap-b` | ×3 | false_positive | same, with `graph.microsoft.com` |
| `role-swap-mdm` | ×3 | false_positive | workstation → MDM server (`mdmdaemon.exe` parent); benign-administration explanation for identical process events |
| `role-swap-sccm` | ×3 | false_positive | workstation → SCCM server (`CcmExec.exe` parent) |
| `parent-spoof` | ×2 | false_positive | explorer.exe delivery vector replaced with msiexec.exe → vendor `install-deps.ps1`; plausible legitimate software-install ancestry |
| `chain-reorder` | ×3 | inconclusive | chronological/parent-child ordering inverted; sequence is neither confirmed TP nor benign |
| `drop-link` | ×3 | inconclusive | sole-evidence stage of the documented chain removed; chain incomplete |

## Discarded mutations (unbroken invariants) — 4

- `benign-payload-rename` (×3, one attempted per chain): renaming the dropped
  payload filename alone (e.g. `zbuild.exe` → `builder.exe`) leaves C2 domains,
  process tree, delivery vector, and all documented techniques intact. No
  invariant broken ⇒ **discarded, not relabelled**.

- `parent-spoof` on `roningloader-gh0st` (×1): the chain's delivery ancestry is
  `chrome.exe → msiexec.exe`, so there is no `explorer.exe` parent to replace and
  the events came out byte-identical to the base TP chain. Only the
  `mutation_spec` metadata (which the eval bridge omits) differed, so it graded the
  same observable attack as FP. No invariant broken ⇒ **discarded, not relabelled**.

Anti-cheat: all labels derive from which documented invariant the mutation breaks,
never from any model output.
