/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prompts shaped the way a user actually talks to a skill such as AI rule
 * creation, rather than the way a MITRE entity is written.
 *
 * The other strata measure whether retrieval can find an entity from something
 * close to its own text. These measure the case that matters for AI tooling:
 * the user supplies intent at some level of abstraction, and the skill has to
 * land on a supported v19.1 entity without the model falling back on whatever
 * ATT&CK it happens to remember.
 *
 * `relevant` lists every entity that would be a correct answer. Where a prompt
 * is genuinely ambiguous, all defensible answers are listed, because a skill
 * that surfaces any of them has done its job.
 */
export interface PromptQuery {
  prompt: string;
  relevant: string[];
  /** Set when the prompt uses vocabulary that v19.1 renamed or retired. */
  staleVocabulary?: boolean;
}

/**
 * Tactic-level asks. The user names a phase of the kill chain, not a behaviour.
 * Several deliberately use pre-v19 vocabulary, which is what a user carrying
 * older ATT&CK habits (or a model drafting on their behalf) will produce.
 */
export const tacticPrompts: PromptQuery[] = [
  { prompt: 'create me a rule that covers stealth tactics', relevant: ['TA0005'] },
  { prompt: 'write a detection for defense evasion', relevant: ['TA0005'], staleVocabulary: true },
  {
    prompt: 'I need coverage for defence evasion techniques',
    relevant: ['TA0005'],
    staleVocabulary: true,
  },
  { prompt: 'build a rule for adversaries trying to hide and blend in', relevant: ['TA0005'] },
  { prompt: 'detect attackers breaking or blinding our security tooling', relevant: ['TA0112'] },
  { prompt: 'I want coverage for defense impairment', relevant: ['TA0112'] },
  { prompt: 'rule for credential theft', relevant: ['TA0006'] },
  { prompt: 'detect someone stealing account names and passwords', relevant: ['TA0006'] },
  { prompt: 'cover lateral movement across my network', relevant: ['TA0008'] },
  { prompt: 'alert when an attacker is looking around the environment', relevant: ['TA0007'] },
  { prompt: 'detect data being stolen out of the network', relevant: ['TA0010'] },
  { prompt: 'rule for attackers keeping access across reboots', relevant: ['TA0003'] },
  { prompt: 'I need privilege escalation coverage', relevant: ['TA0004'] },
  { prompt: 'detect command and control beaconing', relevant: ['TA0011'] },
  { prompt: 'cover destructive ransomware style activity', relevant: ['TA0040'] },
  { prompt: 'detect initial access attempts against my org', relevant: ['TA0001'] },
  { prompt: 'cover the reconnaissance phase before an attack', relevant: ['TA0043'] },
  { prompt: 'rule for malicious code execution on endpoints', relevant: ['TA0002'] },
  { prompt: 'detect adversaries gathering data they plan to steal', relevant: ['TA0009'] },
];

/**
 * Abstract or outcome-level asks. The user describes a situation or a worry
 * rather than a technique, so retrieval has to bridge a wide vocabulary gap.
 */
export const abstractPrompts: PromptQuery[] = [
  {
    prompt: 'create a rule that catches someone covering their tracks on a linux server',
    relevant: ['T1685.006', 'T1070.003', 'T1690'],
  },
  {
    prompt: 'detect malware that runs entirely in memory and never touches disk',
    relevant: ['T1620', 'T1055'],
  },
  {
    prompt: 'I am worried about ransomware, give me a rule',
    relevant: ['T1486', 'T1485'],
  },
  {
    prompt: 'something that alerts when a user account is used from somewhere it should not be',
    relevant: ['T1078'],
  },
  {
    prompt: 'catch attackers guessing passwords over and over',
    relevant: ['T1110'],
  },
  {
    prompt: 'we keep getting emails with bad attachments, write a detection',
    relevant: ['T1566.001', 'T1566'],
  },
  {
    prompt: 'alert me when someone pulls a big pile of files together before sending them out',
    relevant: ['T1560'],
  },
  {
    prompt: 'detect a backdoor left behind on our public web server',
    relevant: ['T1505.003'],
  },
  {
    prompt: 'I want to know when malware downloads more malware onto the box',
    relevant: ['T1105'],
  },
  {
    prompt: 'catch programs that pretend to be legitimate windows binaries',
    relevant: ['T1036', 'T1036.004', 'T1036.008'],
  },
  {
    prompt: 'alert when someone sets up something to run automatically on a schedule',
    relevant: ['T1053', 'T1053.005', 'T1053.003'],
  },
  {
    prompt: 'detect data leaving over an unusual channel',
    relevant: ['T1048', 'T1567', 'T1041'],
  },
  {
    prompt: 'I need to catch hands on keyboard activity where they poke around the machine',
    relevant: ['T1082', 'T1087', 'T1057'],
  },
  {
    prompt: 'write me something for attackers hiding commands so they are hard to read',
    relevant: ['T1027', 'T1027.010'],
  },
  {
    prompt: 'detect remote logins being used to hop between machines',
    relevant: ['T1021', 'T1021.001'],
  },
  {
    prompt: 'we had an incident where they turned off the av, cover that',
    relevant: ['T1685'],
  },
];

/**
 * The user describes a specific technique in their own words, without using its
 * ATT&CK name. This is the case where the skill must resolve loose phrasing to
 * exactly one supported entity.
 */
export const techniqueDescriptionPrompts: PromptQuery[] = [
  {
    prompt:
      'rule for when a process reads the memory of the windows process that holds credentials',
    relevant: ['T1003.001'],
  },
  {
    prompt: 'detect a machine pretending to be a domain controller to pull password hashes',
    relevant: ['T1003.006'],
  },
  {
    prompt: 'alert on scripts run through the built in windows shell that automates administration',
    relevant: ['T1059.001'],
  },
  {
    prompt: 'catch remote code execution using the windows management service',
    relevant: ['T1047'],
  },
  {
    prompt: 'detect when the attacker deletes the shadow copies so you cannot roll back',
    relevant: ['T1490'],
  },
  {
    prompt: 'find when someone dumps the local windows password database from the registry',
    relevant: ['T1003.002'],
  },
  {
    prompt: 'alert when code is written into another running program and executed there',
    relevant: ['T1055'],
  },
  {
    prompt: 'rule for tunneling traffic out disguised as normal name lookups',
    relevant: ['T1071.004'],
  },
  {
    prompt: 'detect an attacker asking the directory service for all the user accounts',
    relevant: ['T1087', 'T1087.002'],
  },
  {
    prompt: 'catch a scheduled job created on a linux host for persistence',
    relevant: ['T1053.003'],
  },
  {
    prompt: 'alert when someone clears the windows security event log',
    relevant: ['T1685.005'],
  },
  {
    prompt: 'detect a malicious library placed so a trusted signed program loads it instead',
    relevant: ['T1574.001'],
  },
  {
    prompt: 'rule for bypassing the windows prompt that asks for admin approval',
    relevant: ['T1548.002'],
  },
  {
    prompt: 'find attackers using stolen kerberos tickets to authenticate',
    relevant: ['T1550.003', 'T1558'],
  },
  {
    prompt: 'detect an attempt to read the linux shadow file with the password hashes',
    relevant: ['T1003.008'],
  },
];
