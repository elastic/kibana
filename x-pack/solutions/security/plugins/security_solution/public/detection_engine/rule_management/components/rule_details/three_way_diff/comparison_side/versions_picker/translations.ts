/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BASE_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.baseVersionLabel',
  {
    defaultMessage: 'Original',
  }
);

export const CURRENT_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.currentVersionLabel',
  {
    defaultMessage: 'Current',
  }
);

export const TARGET_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.targetVersionLabel',
  {
    defaultMessage: 'Elastic update',
  }
);

export const FINAL_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.finalVersionLabel',
  {
    defaultMessage: 'Final',
  }
);

export const VERSION1_VS_VERSION2 = (version1: string, version2: string): string => {
  return i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.version1VsVersion2',
    {
      defaultMessage: '{version1} vs {version2}',
      values: {
        version1,
        version2,
      },
    }
  );
};

export const VERSION_PICKER_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versionsPicker.ariaLabel',
  {
    defaultMessage: 'Select versions to compare',
  }
);
