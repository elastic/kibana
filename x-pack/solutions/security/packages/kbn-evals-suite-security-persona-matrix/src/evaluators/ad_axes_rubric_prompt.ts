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
export const AD_AXES_MAX_SUBMISSION_CHARS = 2_000_000;

/** One entry per true intrusion in the 95-alert corpus; `-PRIV` hosts fold into their parent chain. */
export const AD_AXES_ANSWER_KEY = [
  '1. SRVMAC08 (macOS): an untrusted app bundle runs, shows a fake system credential prompt through osascript, drops and runs a helper that reads the login keychain. T1204.002, T1056.002, T1555.001.',
  '2. SRVWIN07 (Windows): a Word document drops a VBScript run by wscript, a one-minute scheduled task is created for persistence, then obfuscated PowerShell runs a dropped script. T1566.001, T1059.005, T1053.005, T1059.001.',
  '3. SRVWIN06 (Windows), Bumblebee loader: msiexec proxy-executes PowerShell, which injects shellcode in memory and beacons out. T1218.007, T1055, T1071.',
  '4. SRVWIN04 (Windows), Qbot: a OneNote file launches mshta on an HTA, curl fetches a payload from 77.75.230.128, rundll32 loads a fake image DLL that injects into AtBroker.exe, Run-key persistence. T1218.005, T1105, T1218.011, T1055, T1547.001.',
  '5. SRVNIX05 (Linux), BPFDoor: an archive is unpacked, the binary is copied to /dev/shm, made executable and started with --init, then deletes itself; the user is root. T1059.004, T1564, T1070.004.',
  '6. SRVWIN03 (Windows), Emotet, the largest alert cluster: an Excel macro spawns several regsvr32 loads of a DLL, the Emotet signature fires in memory, DLL copies land in system paths, Run-key persistence. T1218.010, T1547.001, T1055.',
  '7. SRVWIN02 (Windows), Sodinokibi (REvil) ransomware: an executable with an expired certificate drops mpsvc.dll, which MsMpEng.exe side-loads; shellcode injects, ransom notes appear, so encryption is active. T1574.002, T1055, T1486, T1553.002.',
  '8. SRVWIN01 (Windows), Excel certutil loader: an Excel macro runs certutil -decode on a staged text file into an executable, which loads cdnver.dll through rundll32 and persists in the registry. T1140, T1218.011, T1547.001.',
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
  'You do not reward verbosity, confident narration or invented indicators (hashes, IPs, families, technique IDs).',
  'Respond by invoking the grade tool.',
].join(' ');

const USER_TEMPLATE = `A model was given the same 95 security alerts and asked to group them into attack discoveries. The alerts contain exactly 8 distinct intrusions, one per host, listed in the answer key. The model had only the alert context and no external tools, so any family, hash, IP or technique it states must be derivable from the alerts; unsupported ones are fabrications.

Score the submission with an integer from ${AD_AXES_MIN_SCORE} to ${AD_AXES_MAX_SCORE} on each axis, then give an overall score:
- coverage: how completely the 8 intrusions are represented as distinguishable discoveries. Missed or hidden-by-merging intrusions lower it.
- accuracy: correct host, malware family, kill chain and techniques against the key. Fabrication and confidently wrong attribution lower it sharply.
- correlation: the right alerts in the right chain. Merging two intrusions, or splitting one into thin chains (including treating a "-PRIV" twin host as a separate attack), lowers it. The discovery count should be near 8.
- actionability: specific titles and summaries, correct entities, fitting tactics, and risk ranking that surfaces the ransomware and the largest infections.
- overall: holistic. A clean, accurate 8 beats a noisy 12; do not reward a high discovery count.

[BEGIN answer key]
${AD_AXES_ANSWER_KEY}
Alerts on a "-PRIV" host are the prevented twin of the same intrusion; folding them into the parent chain is correct.
[END answer key]

[BEGIN overall anchors]
${AD_AXES_ANCHORS}
[END overall anchors]

[BEGIN submission]
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
