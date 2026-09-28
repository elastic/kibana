/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AD2_CLEAN_SCENARIO_KEYS } from '../scenario_registry';
import type { AttackDiscoveryAgentBuilderExample } from '../types';
import { buildScenarioRegistryProvidedAlertsExample } from './build_scenario_registry_provided_alerts';

/** Clean-profile scenario keys (4 attack chains, 16 alerts). */
export const CLEAN_PROFILE_SCENARIO_KEYS = AD2_CLEAN_SCENARIO_KEYS;

export interface CleanProfileProvidedAlertsExamples {
  readonly encodedPowershell: AttackDiscoveryAgentBuilderExample;
  readonly bitsMshta: AttackDiscoveryAgentBuilderExample;
  readonly linuxCurl: AttackDiscoveryAgentBuilderExample;
  readonly wmiLateral: AttackDiscoveryAgentBuilderExample;
}

/**
 * The four clean-profile chains' provided-alerts examples, resolved against the
 * run that seeded them.
 *
 * The ids the examples hand the model ARE the ids the seeder writes (both go
 * through `getAd2ScenarioAlertIds` with the same marker), so a run can only
 * reference its own documents — and a reference built from another run's marker
 * cannot silently pass.
 */
export const buildCleanProfileProvidedAlertsExamples = (
  runMarker: string
): CleanProfileProvidedAlertsExamples => ({
  encodedPowershell: buildScenarioRegistryProvidedAlertsExample(
    {
      scenarioKey: 'encoded-powershell',
      host: 'wks-alice-01',
      chainLabel: 'encoded PowerShell attack chain',
      title: 'Encoded PowerShell download cradle on wks-alice-01',
      summaryMarkdown:
        'Office-spawned encoded PowerShell on wks-alice-01 connected to malicious-c2.example.com, established Run-key persistence, and attempted SMB lateral movement.',
      detailsMarkdown:
        'Four correlated alerts on wks-alice-01 trace a download cradle: WINWORD.EXE spawned encoded PowerShell, the process reached malicious-c2.example.com, a Run key was added for update.ps1, and an administrative SMB share on srv-files-02 was accessed.',
      entitySummaryMarkdown: 'Encoded PowerShell cradle and lateral movement on wks-alice-01',
      mitreAttackTactics: ['Execution', 'Command and Control', 'Persistence', 'Lateral Movement'],
      criteria: [
        'Insights mention encoded PowerShell execution or Office spawning PowerShell.',
        'Insights mention C2 connection to malicious-c2.example.com or suspicious outbound network activity.',
        'Insights mention persistence via Run key or update.ps1.',
        'Insights mention SMB lateral movement or srv-files-02.',
        'Insights reference the host wks-alice-01.',
      ],
    },
    runMarker
  ),
  bitsMshta: buildScenarioRegistryProvidedAlertsExample(
    {
      scenarioKey: 'bits-mshta',
      host: 'wks-jordan-04',
      chainLabel: 'BITS and mshta LOLBin attack chain',
      title: 'BITS and mshta LOLBin chain on wks-jordan-04',
      summaryMarkdown:
        'Adobe Reader spawned BITS on wks-jordan-04, mshta retrieved an HTA payload, schtasks created UpdateCheck persistence, and rundll32 dumped LSASS via comsvcs.dll.',
      detailsMarkdown:
        'Four correlated alerts on wks-jordan-04 trace a LOLBin chain: AcroRd32.exe launched bitsadmin, mshta pulled an HTA from cdn-fastupdate.example.net, schtasks registered UpdateCheck, and rundll32 invoked MiniDump against LSASS.',
      entitySummaryMarkdown: 'BITS/mshta cradle and credential access on wks-jordan-04',
      mitreAttackTactics: ['Execution', 'Command and Control', 'Persistence', 'Credential Access'],
      criteria: [
        'Insights mention Adobe Reader spawning bitsadmin or BITS transfer activity.',
        'Insights mention mshta retrieving an HTA from cdn-fastupdate.example.net.',
        'Insights mention scheduled task persistence via schtasks or UpdateCheck.',
        'Insights mention LSASS memory dump, comsvcs.dll, or rundll32 MiniDump.',
        'Insights reference the host wks-jordan-04.',
      ],
    },
    runMarker
  ),
  linuxCurl: buildScenarioRegistryProvidedAlertsExample(
    {
      scenarioKey: 'linux-curl',
      host: 'web-prod-07',
      chainLabel: 'Linux nginx exploit and curl pipe bash attack chain',
      title: 'Linux nginx exploit to curl pipe bash on web-prod-07',
      summaryMarkdown:
        'An nginx worker on web-prod-07 spawned a shell that curled drops.example.io, installed a cron reverse shell, and created a SUID bash binary under /tmp.',
      detailsMarkdown:
        'Four correlated alerts on web-prod-07 trace a web exploit chain: nginx spawned /bin/sh with curl pipe bash, curl reached drops.example.io, www-data wrote a cron entry, and chmod created a SUID copy of bash in /tmp.',
      entitySummaryMarkdown: 'Web exploit, curl cradle, and SUID persistence on web-prod-07',
      mitreAttackTactics: ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation'],
      criteria: [
        'Insights mention nginx or a web server spawning a shell.',
        'Insights mention curl connecting to drops.example.io or pipe-to-bash execution.',
        'Insights mention cron persistence written by www-data.',
        'Insights mention SUID bash or chmod 4755 under /tmp.',
        'Insights reference the host web-prod-07.',
      ],
    },
    runMarker
  ),
  wmiLateral: buildScenarioRegistryProvidedAlertsExample(
    {
      scenarioKey: 'wmi-lateral',
      host: 'wks-karen-06',
      chainLabel: 'WMI lateral movement attack chain',
      title: 'WMI lateral movement and subscription persistence on wks-karen-06',
      summaryMarkdown:
        'msiexec spawned suspicious rundll32 on wks-karen-06, certutil downloaded a payload, WMI event subscription persistence was created, and schtasks ran remotely on dc-fs-09.',
      detailsMarkdown:
        'Four correlated alerts on wks-karen-06 trace WMI-centric lateral movement: msiexec launched rundll32 with a scriptlet, certutil cached a payload from updates.legitimatesoft.example.com, a WMI subscription consumer was created, and WMI launched remote schtasks on dc-fs-09.',
      entitySummaryMarkdown: 'WMI persistence and remote task creation from wks-karen-06',
      mitreAttackTactics: ['Execution', 'Persistence', 'Lateral Movement'],
      criteria: [
        'Insights mention msiexec spawning rundll32 or a suspicious scriptlet.',
        'Insights mention certutil downloading from updates.legitimatesoft.example.com.',
        'Insights mention WMI event subscription or __EventFilter persistence.',
        'Insights mention remote scheduled task creation on dc-fs-09 via WMI.',
        'Insights reference the host wks-karen-06.',
      ],
    },
    runMarker
  ),
});

/**
 * The four clean chains' reference discoveries, shared with the dense profile.
 *
 * Dense seeds the same four chains verbatim (plus background noise), so its
 * ground truth IS this list. The dense live-retrieval dataset must carry it as
 * `output.attackDiscoveries`: without a reference the Rubric evaluator
 * structurally returns N/A (measured 7/7 N/A on golden before this export
 * existed), which silently removes the suite's main quality signal on exactly
 * the profile whose whole point is measurability.
 *
 * Resolved per run: the reference `alertIds` have to name the documents the
 * run seeded, which are the run's own ids.
 */
export const buildCleanProfileReferenceDiscoveries = (runMarker: string) =>
  Object.values(buildCleanProfileProvidedAlertsExamples(runMarker)).flatMap(
    (example) => example.output?.attackDiscoveries ?? []
  );

export const CLEAN_PROFILE_PROVIDED_ALERTS_DATASET_NAME =
  'attack-discovery-agent-builder: scenario-registry (clean profile)';

export const buildCleanProfileProvidedAlertsDataset = (runMarker: string) => {
  const examples = buildCleanProfileProvidedAlertsExamples(runMarker);
  return {
    name: CLEAN_PROFILE_PROVIDED_ALERTS_DATASET_NAME,
    description:
      'Provided-alerts Attack Discovery evals for all four clean-profile chains from the scenario registry.',
    examples: [
      examples.encodedPowershell,
      examples.bitsMshta,
      examples.linuxCurl,
      examples.wmiLateral,
    ],
  };
};
