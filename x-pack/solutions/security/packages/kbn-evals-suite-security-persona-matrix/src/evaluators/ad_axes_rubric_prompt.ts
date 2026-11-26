/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';

export const AD_AXES_MIN_SCORE = 1;
export const AD_AXES_MAX_SCORE = 10;
export const AD_AXES_MAX_SUBMISSION_CHARS = 400_000;

/** The 8-intrusion answer key, including the `-PRIV` twin rule and how to apply it. */
export const AD_AXES_ANSWER_KEY = [
  '**The 95 alerts contain exactly 8 distinct intrusions, one per host.** A top-tier model therefore produces **8 discoveries** — one coherent attack chain per host. This "8" is the single most important number in this evaluation: it is the count of real attacks in the data.',
  '',
  'Use this answer key to grade accuracy. Each row is one true intrusion:',
  '',
  '| # | Host | Malware / family | Kill chain (how it unfolds) | Key MITRE techniques |',
  '|---|------|------------------|------------------------------|----------------------|',
  '| 1 | **SRVMAC08** (macOS) | Credential phishing + keychain theft | `My Go Application.app` (untrusted/AppTranslocation) executes → spawns `osascript` showing a fake "System Preferences" credential prompt → drops `unix1`, `chmod 777` → `unix1` dumps the login keychain (`login.keychain-db`) for user `james` | T1204.002 (User Execution), T1056.002 (GUI Input Capture), T1555.001 (Keychain), T1222.002 |',
  '| 2 | **SRVWIN07** (Windows) | Office macro → persistence | `WINWORD.EXE` opens malicious `.doc` → drops `AppPool.vbs` → `wscript.exe` runs it → `schtasks` creates a 1-minute scheduled task for persistence → obfuscated `powershell.exe -exec bypass` runs `AppPool.ps1` | T1566.001, T1059.005 (VBScript), T1053.005 (Scheduled Task), T1059.001 (PowerShell) |',
  '| 3 | **SRVWIN06** (Windows) | **Bumblebee** loader | `msiexec.exe` proxy-executes `powershell.exe` running `chch.ps1` → shellcode injection in PowerShell (PID 6228) → `Windows.Trojan.Bumblebee` in memory → outbound C2 | T1218.007 (Msiexec), T1055 (Process Injection), T1071 (C2) |',
  '| 4 | **SRVWIN04** (Windows) | **Qbot** (Qakbot) | `ONENOTE.EXE` opens `ApplicationReject_68390(Jan31).one` → spawns `mshta.exe` on `attachment.hta` → `curl.exe` downloads `19825.dat` from `77.75.230.128` → `rundll32.exe` loads `121.png` → injects `AtBroker.exe` → `Windows.Trojan.Qbot` → Registry Run Key persistence | T1218.005 (Mshta), T1105 (Ingress Tool Transfer), T1218.011 (Rundll32), T1055, T1547.001 |',
  '| 5 | **SRVNIX05** (Linux) | **BPFDoor** backdoor | `unzip 9415656314.zip` extracts trojan → copied to `/dev/shm/kdmtmpflush` → `chmod 755` → executed `--init` → self-deletes; `Linux.Trojan.BPFDoor` by memory signature; user `root` | T1059.004, T1564 (Hide Artifacts / tmpfs), T1070.004 (File Deletion) |',
  '| 6 | **SRVWIN03** (Windows) | **Emotet** (largest alert cluster) | `EXCEL.EXE` macro spawns multiple `regsvr32.exe` loading `oxnv1..4.ooccxx` → DLL `bb444759…df36` loaded → `Windows.Trojan.Emotet` in memory → DLL copied to System32 paths → Registry Run Key persistence | T1218.010 (Regsvr32), T1547.001, T1055 |',
  '| 7 | **SRVWIN02** (Windows) | **Sodinokibi / REvil** ransomware | `explorer.exe` launches `d55f983c…9f1e.exe` (expired cert "PB03 TRANSPORT LTD.") → drops `mpsvc.dll` to `C:\\Windows\\` → **DLL side-loaded** by legitimate `MsMpEng.exe` → shellcode injection → `Windows.Ransomware.Sodinokibi` → canary/ransom-note files (`hd3vuk19y-readme.txt`) = active encryption | T1574.002 (DLL Side-Loading), T1055, T1486 (Data Encrypted for Impact), T1553.002 |',
  '| 8 | **SRVWIN01** (Windows) | Excel → certutil loader | `EXCEL.EXE` macro spawns `certutil.exe -decode C:\\Programdata\\B1Z8U2N9.txt … Q3C7N1V8.exe` → decoded `Q3C7N1V8.exe` runs → drops/loads `cdnver.dll` via `rundll32` → registry persistence | T1140 (Deobfuscate/Decode), T1218.011 (Rundll32), T1547.001 |',
  '',
  '**On `-PRIV` host twins:** Several attacks also fired a *prevention*-side alert on a paired host name (e.g., `SRVWIN07-PRIV`, `SRVWIN03-PRIV`). These are the prevented twin of the *same* intrusion, not a 9th/10th separate attack. **Folding the `-PRIV` twin into its parent chain is correct.** Spinning each `-PRIV` host into its own separate discovery is over-splitting and should cost Correlation points.',
  '',
  '**How to use the answer key:**',
  '- A model that produces **8 discoveries, each mapping cleanly to one row above with the right host + family + technique**, is the gold standard.',
  '- A model that produces fewer than 8 has **merged** distinct intrusions (e.g., lumped two hosts together) or **missed** threats — dock Coverage.',
  '- A model that produces more than 8 has likely **over-split** one intrusion into several thin chains — dock Correlation.',
  '- A model that names the wrong malware family, wrong host or a technique that contradicts the row for that host — dock Accuracy.',
  '- You do not see the 95 alerts. Hashes are abbreviated in this key (e.g. `bb444759…df36`), and the key lists only the key indicators. A hash, IP, file name or other detail that this key neither confirms nor contradicts is **unverifiable**: do not treat it as fabricated, and do not award credit for it either. A full hash that matches an abbreviated one here (same leading and trailing characters) is consistent with the key.',
].join('\n');

/** Per-axis grading guidance with the 10 / 1-2 anchors. */
export const AD_AXES_AXIS_GUIDE = [
  '### Axis 1 — Coverage',
  'How completely did the model account for the **8 true intrusions**?',
  '- Did it surface all 8 hosts/attacks (ideally as 8 distinct discoveries)?',
  '- Penalize **missing** threats (e.g., dropped the Linux BPFDoor or macOS keychain chain) and penalize **merging** that hides a distinct attack.',
  '- 10 = all 8 intrusions represented and distinguishable; 1–2 = found one or none.',
  '',
  '### Axis 2 — Accuracy',
  'How factually correct is each chain vs. the answer key? Grade only what the key can check.',
  '- Correct **host**, correct **malware family** (Emotet/Qbot/Bumblebee/Sodinokibi/BPFDoor), correct **kill chain**, correct **MITRE techniques**.',
  '- Penalize contradictions of the key hard: a confidently wrong malware family, a wrong host attribution, a kill chain or technique that does not match the row for that host, a family attached to a host whose row names none, or an IP, file or hash that differs from one the key lists for that chain.',
  '- Details the key does not cover are unverifiable; neither reward nor penalize them.',
  '- 10 = attributions and techniques match the key across the board with no contradiction; low scores for confident-but-wrong narration.',
  '',
  '### Axis 3 — Correlation quality',
  'Did the model group the **right alerts into the right chain**?',
  '- No **merging** two distinct intrusions into one discovery.',
  '- No **over-splitting** one intrusion into several (including treating `-PRIV` twins as separate attacks).',
  '- The alert-count per discovery and the number of discoveries should reflect the true structure (8 chains).',
  '- 10 = clean one-chain-per-intrusion grouping; penalize both noisy >8 thin output and collapsed <8 output.',
  '',
  '### Axis 4 — Actionability',
  'Could a SOC analyst act on this output as-is?',
  '- Clear, specific **titles** and **summaries**; correct **entity summary** (host/user); appropriate **MITRE tactics**; sensible **risk prioritization** (the ransomware and largest infections should rank high).',
  '- Penalize vague titles, generic narration, or risk scores that bury the worst incident.',
  '- 10 = immediately usable incident write-ups; low scores for vague or misleading output.',
].join('\n');

export const AD_AXES_ANCHORS = [
  '1-2 Broken or wrong: nothing usable, about one attack found, or the core facts invented.',
  '3-4 Weak: a few attacks caught, but heavy merging or splitting, several intrusions missed, or notable fabrication.',
  '5-6 Adequate: the gist of most attacks, but shallow, partly miscorrelated, or with a clearly wrong family or host.',
  '7-8 Strong: most or all 8 intrusions captured with accurate families and techniques and clean correlation. Minor gaps only.',
  '9-10 Excellent: about 8 cleanly correlated chains, accurate hosts, families and techniques, no fabrication, sensibly prioritised and immediately actionable. Reserve 10 for near-flawless work.',
].join('\n');

const SYSTEM_TEMPLATE = [
  "You are a rigorous, skeptical SOC analyst who reviews other analysts' incident write-ups.",
  'You know endpoint detection, MITRE ATT&CK, malware families and cross-host alert correlation.',
  'You do not reward verbosity or confident narration, and you grade facts only against the answer key you are given.',
  'Respond by invoking the grade tool.',
].join(' ');

const USER_TEMPLATE = `A model was given the same 95 security alerts and asked to group them into attack discoveries. You do not see those alerts: you see only the model's discoveries and the answer key below. Judge accuracy against the key. A stated host, family or technique that contradicts the key is wrong; an indicator the key neither confirms nor contradicts is unverifiable, not a fabrication.

Score the submission with an integer from ${AD_AXES_MIN_SCORE} to ${AD_AXES_MAX_SCORE} on each axis, then give an overall score. Latency is not part of the quality axes.

[BEGIN answer key]
${AD_AXES_ANSWER_KEY}
[END answer key]

[BEGIN axis guide]
${AD_AXES_AXIS_GUIDE}
[END axis guide]

[BEGIN overall anchors]
${AD_AXES_ANCHORS}
Anchor overall near the mean of the axes but weight egregious failures (fabricated core facts, a missed ransomware chain) more heavily than a plain average would.
A clean, accurate 8 beats a noisy 12; do not reward a high discovery count by itself.
[END overall anchors]

{{{truncationNote}}}[BEGIN submission]
{{{submission}}}
[END submission]`;

// The tool schema type has no integer/range keywords; the evaluator enforces both.
const axisSchema = {
  type: 'number',
  description: `Integer from ${AD_AXES_MIN_SCORE} to ${AD_AXES_MAX_SCORE}.`,
} as const;

export const AdAxesRubricPrompt = createPrompt({
  name: 'persona_matrix_ad_axes_judge',
  description: 'Judge an Attack Discovery result on coverage, accuracy, correlation, actionability',
  input: lazySchema(() =>
    z.object({
      submission: z.string().max(AD_AXES_MAX_SUBMISSION_CHARS),
      truncationNote: z.string().max(500),
    })
  ),
})
  .version({
    system: { mustache: { template: SYSTEM_TEMPLATE } },
    template: { mustache: { template: USER_TEMPLATE } },
    toolChoice: { function: 'grade' },
    tools: {
      grade: {
        description: `Return integer scores from ${AD_AXES_MIN_SCORE} to ${AD_AXES_MAX_SCORE} for each axis and overall, with a short justification.`,
        schema: {
          type: 'object',
          properties: {
            coverage: axisSchema,
            accuracy: axisSchema,
            correlation: axisSchema,
            actionability: axisSchema,
            overall: axisSchema,
            explanation: { type: 'string' },
          },
          required: [
            'coverage',
            'accuracy',
            'correlation',
            'actionability',
            'overall',
            'explanation',
          ],
        },
      },
    },
  } as const)
  .get();
