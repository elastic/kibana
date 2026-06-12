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
    defaultMessage: 'This field has no Elastic update but can still be edited if needed.',
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
    defaultMessage:
      "There are no conflicts with the field's current value and incoming Elastic update.",
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
    defaultMessage: 'Auto-resolved conflict',
  }
);

export const SOLVABLE_CONFLICT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.solvableConflictDescription',
  {
    defaultMessage:
      "We combined your changes with changes from the Elastic update. Review the suggested changes to ensure they're correct.",
  }
);

export const NON_SOLVABLE_CONFLICT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.nonSolvableConflict',
  {
    defaultMessage: 'Unresolved conflict',
  }
);

export const NON_SOLVABLE_CONFLICT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.nonSolvableConflictDescription',
  {
    defaultMessage:
      "We couldn't resolve this conflict. Edit the provided current version before saving and accepting the final update.",
  }
);

export const SEPARATOR = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.separator',
  {
    defaultMessage: ' - ',
  }
);
