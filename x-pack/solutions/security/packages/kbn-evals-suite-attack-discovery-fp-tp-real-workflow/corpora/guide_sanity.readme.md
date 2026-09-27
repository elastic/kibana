# guide-sanity corpus

- **Source:** Microsoft GUIDE benchmark, public 750-incident eval slice (`guide/guide_eval_slice.csv`, 49k evidence rows), incident labels from `guide/slice_selection.json` majority vote.
- **Cases:** 750. `provenance = public` for every case; labels come only from the public dataset (TruePositive→true_positive, FalsePositive→false_positive, BenignPositive→inconclusive). No gold label is derived from any model output.
- **Known label-noise property:** GUIDE incident grades carry ~**21.6% majority-vote label noise** (measured against expert review in the GUIDE paper). Treat every label as noisy public annotation, not ground truth.
- **Permitted use: external sanity checks only.** This corpus may be used to sanity-check system verdicts at the corpus level. **Acceptance thresholds (pass/fail gates) computed against guide-sanity labels are forbidden** — noisy labels cannot gate releases.

## Structure

Each JSONL case: `case_id` (`guide-sanity-<incidentId>`), `corpus` (`guide-sanity`), `label`, `label_provenance` (`public`), `source_ref` (`GUIDE:<incidentId>`), `payload` (verdict-relevant incident evidence summary: IncidentId, Timestamp, DetectorId(s), MitreTechniques, Category, evidence roles/entities, devices, accounts, suspicion level, GUIDE_IncidentGrade), `gold_rationale` (provenance statement).
