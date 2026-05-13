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
      'Set malware detection and prevention levels for your endpoints. Changes apply to all hosts assigned to this policy.',
  }
);

/** Subdued header line under the Malicious behavior card title. */
export const BEHAVIOR_POLICY_SECTION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.sectionDescription.behavior',
  {
    defaultMessage:
      'Control how Elastic Defend responds to malicious behavior on your endpoints. Choose between detection only or full prevention, and configure user notification behavior.',
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
      'Control which external devices — such as USB drives and removable media — can interact with your endpoints. Set read, write, and execute permissions per OS.',
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
      'Select which system events to collect for monitoring and analysis. Selecting more event types increases visibility but may impact performance — enable only what you use and require.',
  }
);
