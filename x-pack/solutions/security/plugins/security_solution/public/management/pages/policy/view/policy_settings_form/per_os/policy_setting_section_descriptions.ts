/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POLICY_SETTING_SECTION_DESCRIPTIONS = Object.freeze({
  malware: i18n.translate('xpack.securitySolution.endpoint.policy.details.malwareDescription', {
    defaultMessage:
      'Scan files on your endpoints for malware. When prevention is on, Elastic Defend blocks malicious files from running and quarantines them.',
  }),
  maliciousBehavior: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.maliciousBehaviorDescription',
    {
      defaultMessage:
        'Watch running processes on your endpoints for known malicious behavior. When prevention is on, Elastic Defend stops the process.',
    }
  ),
  memoryThreat: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.memoryThreatDescription',
    {
      defaultMessage:
        'Find in-memory attacks on your endpoints. When prevention is on, Elastic Defend stops the affected process or thread.',
    }
  ),
  ransomware: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.ransomwareDescription',
    {
      defaultMessage:
        'Look for ransomware behavior on your endpoints. When prevention is on, Elastic Defend blocks the ransomware from running.',
    }
  ),
  antivirusSolution: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.antivirusSolutionDescription',
    {
      defaultMessage:
        'Register Elastic Security as antivirus software on your endpoints. Registering also disables Windows Defender.',
    }
  ),
  deviceControl: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.deviceControlDescription',
    {
      defaultMessage:
        'Control which external devices — such as USB drives and removable media — can interact with your endpoints. Set read, write, and execute permissions per OS.',
    }
  ),
  attackSurfaceReduction: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.attackSurfaceReductionDescription',
    {
      defaultMessage:
        'Limit the ways attackers can compromise your endpoints by reducing exposure to common attack techniques. Credential hardening options protect Windows system credentials from unauthorized access.',
    }
  ),
  eventCollection: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.eventCollectionDescription',
    {
      defaultMessage:
        'Select which system events to collect for monitoring and analysis. Selecting more event types increases visibility but may impact performance — enable only what you use and require.',
    }
  ),
  aiDataCollection: i18n.translate(
    'xpack.securitySolution.endpoint.policy.details.aiDataCollectionDescription',
    {
      defaultMessage:
        'Identify AI tools and add that context to events that Elastic Defend collects from them. This improves visibility into AI activity on your hosts.',
    }
  ),
});
