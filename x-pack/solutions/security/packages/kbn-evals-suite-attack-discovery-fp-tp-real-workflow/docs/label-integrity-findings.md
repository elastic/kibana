# Label-integrity findings — adversarial_twins & perturbations corpora

Scope: elastic/kibana#293133, review verdict on head 13da33faf (finding 5, non-blocking).
These are corpus findings, not fixes: gold labels are NOT changed in this PR.

## 5(a) adversarial_twins FP gold labels contradicted by payload residue

Every FP-labelled mutation keeps the complete malicious event set from its base chain;
the mutation only changes one field. The retained messages explicitly describe malicious
behavior, so an evidence-reading classifier has direct grounds to answer true_positive,
contradicting the false_positive gold. Affected cases (all 12 FP-labelled mutations):

| case_id | mutation | residue contradicting FP gold |
|---|---|---|
| mut-roningloader-gh0st-role-swap-sccm | entity-role-swap | retained "AV termination via injected remote process", "gh0st RAT variant", "C2 beacon to qaqkongtiao[.]com"; delivery parent chrome.exe unmutated |
| mut-roningloader-gh0st-role-swap-mdm | entity-role-swap | same malicious message set retained |
| mut-roningloader-gh0st-domain-swap-a | domain-swap | C2 domain replaced, but "final payload C2 beacon to qaqkongtiao[.]com" message retained verbatim — beacon destination still named |
| mut-roningloader-gh0st-domain-swap-b | domain-swap | same as above |
| mut-roningloader-gh0st-parent-spoof | parent-process-spoof | parent only changed at the first hop; "trojanized MSI masquerading as legitimate software" + full post-exploitation chain retained |
| mut-mimicrat-clickfix-role-swap-sccm | entity-role-swap | "powershell.exe resolved xMRi.network and downloaded second-stage", AMSI patch, loader download retained |
| mut-mimicrat-clickfix-role-swap-mdm | entity-role-swap | same residue |
| mut-mimicrat-clickfix-domain-swap-a | domain-swap | xMRi.network still named in event message; mutation only rewrote the network destination |
| mut-mimicrat-clickfix-domain-swap-b | domain-swap | same |
| mut-mimicrat-clickfix-parent-spoof | parent-process-spoof | clipboard-injected obfuscated PowerShell + AMSI patch retained |
| mut-kremlin-banking-role-swap-sccm | entity-role-swap | "loader callback to C2 connection[.]upgradeonline.site", certutil decode retained |
| mut-kremlin-banking-role-swap-mdm | entity-role-swap | same |

Pattern: the mutator rewrote entity/parent/domain ECS fields but not the free-text
`message` strings, and (for role-swap) left non-first-hop parents (rundll32→6uf9i,
CcmExec→powershell etc. only at entry) unmutated in places. Root fix belongs in the
corpus builder: either scrub/neutralize the contradicting message text and all parent
references per mutation, or relabel these cases. Until then these 12 FP labels should
be treated as contested (candidate: mark `label_provenance=contested` and exclude from
gated metrics, mirroring the PROVISIONAL mechanism).

## 5(b) readme/payload drift (fixed in this PR)

corpora/adversarial_twins.readme.md mutation catalog used type names that do not occur
in payload.mutation_spec.type (readme `domain-swap-a/b`, `role-swap-mdm/sccm`,
`parent-spoof`, `chain-reorder`, `drop-link` vs actual `domain-swap`,
`entity-role-swap`, `parent-process-spoof`, `chain-reorder`, `drop-link`, with a/b and
mdm/sccm variants distinguished only inside `description`), and miscounted per-type
multiplicity (7 rows x "per chain 3" vs the actual one-variant-per-chain layout of 21
cases). Readme now lists the actual types and per-case counts and carries a label-
integrity note pointing at this file.
