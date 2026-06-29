/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype "v.2" MITRE ATT&CK tactic constants shared by:
 *  - the right-panel Behavioral anomalies v.2 overview (compact chain, no labels)
 *  - the BA-v.2 left flyout tab (labeled "Attack chain" section + swim lane Y-axis)
 *
 * The list intentionally diverges from canonical MITRE Enterprise (which has 14
 * tactics) so this prototype can demo a 15-row swim lane: "Stealth" and
 * "Defense Impairment" are design-only additions that replace "Defense Evasion".
 *
 * Cleanup before hand-off: delete the entire `mitre/` folder when either both
 * v.2 prototypes are dropped or the canonical Attack discovery `AttackChain`
 * is swapped in.
 */

/** 15 MITRE ATT&CK tactics in kill-chain order — design-mock list. */
export const MITRE_TACTIC_NAMES: readonly string[] = [
  'Reconnaissance',
  'Resource Development',
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Stealth',
  'Defense Impairment',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
] as const;

export const MITRE_TACTIC_COUNT = MITRE_TACTIC_NAMES.length;
