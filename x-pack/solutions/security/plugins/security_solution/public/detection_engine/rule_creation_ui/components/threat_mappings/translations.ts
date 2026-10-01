/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THREAT_MAPPINGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.threatMappings.title',
  {
    defaultMessage: 'Threat mappings',
  }
);

export const MITRE_ATTACK_FRAMEWORK = i18n.translate(
  'xpack.securitySolution.detectionEngine.threatMappings.mitreAttackFramework',
  {
    defaultMessage: 'MITRE ATT&CK\u2122',
  }
);

export const MITRE_ATLAS_FRAMEWORK = i18n.translate(
  'xpack.securitySolution.detectionEngine.threatMappings.mitreAtlasFramework',
  {
    defaultMessage: 'MITRE ATLAS',
  }
);

export const ADD_FRAMEWORK = i18n.translate(
  'xpack.securitySolution.detectionEngine.threatMappings.addFramework',
  {
    defaultMessage: 'Add framework',
  }
);

export const REMOVE_FRAMEWORK = i18n.translate(
  'xpack.securitySolution.detectionEngine.threatMappings.removeFramework',
  {
    defaultMessage: 'Remove framework',
  }
);
