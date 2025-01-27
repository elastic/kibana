/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.noUpdate',
  {
    defaultMessage: 'No update',
  }
);

export const NO_UPDATE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.noUpdateDescription',
  {
    defaultMessage:
      'The field was modified after rule installation but does not have Elastic update.',
  }
);

export const SAME_UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.sameUpdate',
  {
    defaultMessage: 'Matching update',
  }
);

export const SAME_UPDATE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.sameUpdateDescription',
  {
    defaultMessage:
      'The field was modified after rule installation, and your changes are the same as the update from Elastic.',
  }
);

export const NO_CONFLICT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.noConflict',
  {
    defaultMessage: 'No conflicts',
  }
);

export const NO_CONFLICT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.noConflictDescription',
  {
    defaultMessage: 'The update has no conflicts and has been applied to the final update.',
  }
);

export const REVIEWED_AND_ACCEPTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.reviewedAndAccepted',
  {
    defaultMessage: 'Reviewed and accepted',
  }
);

export const SOLVABLE_CONFLICT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.solvableConflict',
  {
    defaultMessage: 'Solved conflict',
  }
);

export const SOLVABLE_CONFLICT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.solvableConflictDescription',
  {
    defaultMessage:
      'We have suggested an update for this modified field, please review before accepting.',
  }
);

export const NON_SOLVABLE_CONFLICT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.nonSolvableConflict',
  {
    defaultMessage: 'Unsolved conflict',
  }
);

export const NON_SOLVABLE_CONFLICT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.nonSolvableConflictDescription',
  {
    defaultMessage:
      'Unable to suggest a merged version for the update. Current version is provided for you to edit.',
  }
);

export const SEPARATOR = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.separator',
  {
    defaultMessage: ' - ',
  }
);
