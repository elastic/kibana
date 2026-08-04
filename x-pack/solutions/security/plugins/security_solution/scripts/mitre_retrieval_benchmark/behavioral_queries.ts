/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BehavioralQuery {
  query: string;
  /** Ground-truth MITRE ids. Validated against the artifact before the run. */
  relevant: string[];
}

/**
 * Hand-written queries phrased the way an analyst describes a behaviour, using
 * vocabulary that deliberately avoids the ATT&CK entity names. This is the
 * stratum where keyword search has the least to work with, so it is where a
 * semantic arm has to earn its keep.
 */
export const behavioralQueries: BehavioralQuery[] = [
  { query: 'adversary reads credentials out of the lsass process memory', relevant: ['T1003.001'] },
  { query: 'replicating directory data from a domain controller', relevant: ['T1003.006'] },
  { query: 'stealing password hashes from the ntds database', relevant: ['T1003.003'] },
  {
    query: 'malware survives reboot by adding itself to a registry autostart location',
    relevant: ['T1547.001'],
  },
  { query: 'attacker keeps access by registering a scheduled job', relevant: ['T1053.005'] },
  { query: 'periodic job on a linux host runs an attacker script', relevant: ['T1053.003'] },
  { query: 'linux daemon installed so the implant restarts at boot', relevant: ['T1543.002'] },
  { query: 'macos property list installed to relaunch a binary', relevant: ['T1543.001'] },
  { query: 'base64 encoded command line passed to the windows shell', relevant: ['T1059.001'] },
  // v19 moved log tampering under the new Defense Impairment tactic (TA0112).
  { query: 'wiping the security log to cover tracks', relevant: ['T1685.005'] },
  { query: 'backdating a file so it blends in with system files', relevant: ['T1070.006'] },
  { query: 'guessing many passwords against one account', relevant: ['T1110'] },
  {
    query: 'trying one common password across every account in the domain',
    relevant: ['T1110.003'],
  },
  { query: 'requesting service tickets to crack offline', relevant: ['T1558.003'] },
  { query: 'forging a ticket granting ticket with a stolen krbtgt key', relevant: ['T1558.001'] },
  { query: 'authenticating with a stolen hash instead of a password', relevant: ['T1550.002'] },
  { query: 'logging in with legitimate stolen account credentials', relevant: ['T1078'] },
  { query: 'user opens a malicious document attached to an email', relevant: ['T1566.001'] },
  { query: 'targeted email tricking a user into clicking a hostile url', relevant: ['T1566.002'] },
  {
    query: 'attacker breaks in through a vulnerable internet facing web server',
    relevant: ['T1190'],
  },
  { query: 'initial access through a corporate vpn appliance', relevant: ['T1133'] },
  { query: 'implant hides its traffic inside domain name lookups', relevant: ['T1071.004'] },
  {
    query: 'implant checks in with its operator over ordinary web traffic',
    relevant: ['T1071.001'],
  },
  { query: 'stolen files uploaded to a third party file sharing service', relevant: ['T1567.002'] },
  {
    query: 'files across the network are made unreadable and a ransom is demanded',
    relevant: ['T1486'],
  },
  { query: 'removing backups so the machine cannot be restored', relevant: ['T1490'] },
  { query: 'turning off the endpoint protection agent', relevant: ['T1685'] },
  {
    query: 'writing shellcode into the address space of another running program',
    relevant: ['T1055'],
  },
  // v19 collapsed DLL Side-Loading and DLL Search Order Hijacking into T1574.001.
  {
    query: 'planting a rogue library next to a signed executable so it gets loaded',
    relevant: ['T1574.001'],
  },
  { query: 'abusing a signed microsoft binary to run attacker code', relevant: ['T1218'] },
  {
    query: 'remote command execution through windows management instrumentation',
    relevant: ['T1047'],
  },
  { query: 'moving between hosts over the remote desktop protocol', relevant: ['T1021.001'] },
  { query: 'hopping to another server over an encrypted shell session', relevant: ['T1021.004'] },
  { query: 'creating an extra administrator account on the machine', relevant: ['T1136.001'] },
  { query: 'quietly adding an account to a highly privileged group', relevant: ['T1098'] },
  { query: 'listing the file shares available on the network', relevant: ['T1135'] },
  { query: 'enumerating every user account in active directory', relevant: ['T1087.002'] },
  {
    query: 'running commands to fingerprint the operating system and hardware',
    relevant: ['T1082'],
  },
  { query: 'periodically grabbing images of what the user sees', relevant: ['T1113'] },
  { query: 'recording every key the victim presses', relevant: ['T1056.001'] },
  { query: 'harvesting saved logins out of the web browser', relevant: ['T1555.003'] },
  { query: 'passwords left lying around in configuration files on disk', relevant: ['T1552.001'] },
  {
    query: 'querying the cloud metadata endpoint for instance credentials',
    relevant: ['T1552.005'],
  },
  { query: 'breaking out of a container onto the underlying host', relevant: ['T1611'] },
  { query: 'background transfer service used to pull down a payload', relevant: ['T1197'] },
  {
    query: 'renaming a malicious binary so it looks like a windows system process',
    relevant: ['T1036.005'],
  },
  { query: 'sidestepping the windows elevation prompt', relevant: ['T1548.002'] },
  {
    query: 'stealing another process security token to gain higher privileges',
    relevant: ['T1134.001'],
  },
  { query: 'collecting files into one folder before sending them out', relevant: ['T1074'] },
  { query: 'compressing gathered data into an archive prior to exfiltration', relevant: ['T1560'] },
];
