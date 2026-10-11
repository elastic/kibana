# Label-integrity findings: adversarial_twins corpus

Scope: elastic/kibana#293133, reviewer verdict on head 13da33faf, finding 5(a).
These are findings for the corpus owner. Gold labels are NOT changed in this PR.

## Finding: FP gold labels contradicted by retained malicious payload

All 15 `false_positive` cases in `corpora/adversarial_twins.jsonl` keep most of the base
chain's malicious event messages. The mutation rewrites one field (domain, host role or
first-hop parent); the free-text `message` strings are left as in the TP base chain.

Measured per case (events whose message matches
`C2|beacon|RAT|AMSI|inject|terminat|masquerad|malicious|obfuscat|payload`):

| base chain | FP cases | events per case | malicious-message events per case |
|---|---|---|---|
| mimicrat-clickfix | 5 | 8 | 4 |
| roningloader-gh0st | 5 | 13 | 7 |
| kremlin-banking | 5 | 10 | 3 |

Specific contradictions:

- `mut-roningloader-gh0st-role-swap-sccm` (and the mdm variant): `chrome.exe` / `msiexec.exe`
  / `rundll32.exe` parents are unchanged. The messages still say "AV termination via
  injected remote process", "stage-4 final payload (gh0st RAT variant)" and "C2 beacon to
  qaqkongtiao[.]com". Only the host name and the first parent were swapped.
- `domain-swap-a` cases still contain the original C2 indicator after the swap:
  `qaqkongtiao` appears 6 times in `mut-roningloader-gh0st-domain-swap-a`, `xMRi` 3 times in
  `mut-mimicrat-clickfix-domain-swap-a`, `upgradeonline` 6 times in
  `mut-kremlin-banking-domain-swap-a`. This contradicts the stated broken invariant
  ("documented C2 infrastructure no longer present").
- `parent-process-spoof` cases change the delivery parent but keep the downstream chain
  (AMSI patch, loader download, etc.).

Implication: a classifier that reads the evidence has direct grounds to answer
true_positive, so a "wrong" verdict on these cases may be correct. Their FP gold should be
treated as contested and kept out of gated metrics until the corpus builder scrubs the
residual messages and indicators (or the cases are relabelled).

Not done here: relabelling or regenerating cases (outside this PR's remit per the review).

## Unverified

The review also lists a finding 5(b). The task text available to this run was truncated
before it, so 5(b) is not addressed here.
