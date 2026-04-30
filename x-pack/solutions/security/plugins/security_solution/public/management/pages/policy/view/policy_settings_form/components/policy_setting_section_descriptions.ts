/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Subdued header line under the Malware card title. */
export const MALWARE_POLICY_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.sectionDescription.malware',
  {
    defaultMessage:
      'Configure how Elastic Defend protects your endpoints. Changes apply to all hosts assigned to this policy.',
  }
);

/** Subdued header line under the Malicious behavior card title. */
export const BEHAVIOR_POLICY_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.sectionDescription.behavior',
  {
    defaultMessage:
      'Control how Elastic Defend detects and responds to malicious files, behaviors, and exploits on your endpoints.',
  }
);

/** Subdued header line under the Memory threat card title. */
export const MEMORY_THREAT_POLICY_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.sectionDescription.memoryThreat',
  {
    defaultMessage:
      'Prevent in-memory attacks such as shellcode injection, reflective DLL loading, and malicious Office macros.',
  }
);

/** Subdued header line under the Ransomware card title. */
export const RANSOMWARE_POLICY_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.sectionDescription.ransomware',
  {
    defaultMessage:
      'Detect ransomware by monitoring canary files and taking response actions when encryption activity is identified.',
  }
);

/** Subdued header line under the Antivirus solution card title. */
export const ANTIVIRUS_POLICY_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.sectionDescription.antivirus',
  {
    defaultMessage:
      'Register Elastic Defend as an antivirus solution for Windows on hosts using this policy.',
  }
);

/** Subdued header line under the Device control card title. */
export const DEVICE_CONTROL_POLICY_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.sectionDescription.deviceControl',
  {
    defaultMessage:
      'Manage how external devices such as USB drives can be used on hosts using this policy.',
  }
);

/** Subdued header line under the Attack surface reduction card title. */
export const ATTACK_SURFACE_REDUCTION_POLICY_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.sectionDescription.attackSurfaceReduction',
  {
    defaultMessage: 'Limit the ways attackers can compromise your endpoints.',
  }
);

/** Subdued header line under each Event collection card title (per OS). */
export const EVENT_COLLECTION_POLICY_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.sectionDescription.eventCollection',
  {
    defaultMessage:
      'Choose which system events Elastic Defend collects from hosts using this policy.',
  }
);
