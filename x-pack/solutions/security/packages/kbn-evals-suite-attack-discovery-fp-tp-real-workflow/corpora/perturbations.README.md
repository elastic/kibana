# perturbations corpus

Invariance-preserving and evidence-reducing variants of each `tp-chains` base
chain (3 chains × 5 variants = 15 cases). `label_provenance=adversarial-mutation`.

## Variants and expected gold

| variant | per chain | gold | rule |
|---|---|---|---|
| `timestamp-shift` | ×3 | true_positive | +37h shift; relative ordering preserved |
| `entity-rename` | ×3 | true_positive | hostnames renamed; entities/order preserved |
| `alert-reorder` | ×3 | true_positive | display order shuffled; each alert individually matches documented stage evidence |
| `drop-one` (redundant event) | ×3 | true_positive | dropped event is not sole evidence of any required stage |
| `drop-one` (sole evidence) | ×3 | inconclusive | dropped event was sole evidence of a required documented stage |

## The drop-one rule (authoritative)

> **Dropping an event that is the sole evidence of a required documented stage
> ⇒ `inconclusive`. Dropping any event whose stage remains evidenced by other
> events in the chain ⇒ `true_positive` (gold unchanged).**

This rule is applied mechanically in `build_phase4.py` (`perturb()`); the
per-case application is recorded in `payload.perturbation_rule` and
`mutation_spec.broken_invariant`.

Anti-cheat: gold labels derive only from this documented rule over writeup-documented
stage evidence — never from any model output.
