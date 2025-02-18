/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FINAL_UPDATE } from '../field_final_side/components/translations';

export const TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.comparisonSide.title',
  {
    defaultMessage: 'Diff view',
  }
);

export const NO_CHANGES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.comparisonSide.noChangesLabel',
  {
    defaultMessage: 'No changes',
  }
);

export const UPDATE_FROM_ELASTIC_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.updateFromElasticTitle',
  {
    defaultMessage: 'Update from Elastic',
  }
);

export const UPDATE_FROM_ELASTIC_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.updateFromElasticExplanation',
  {
    defaultMessage: 'view the changes in Elastic’s latest update',
  }
);

export const MY_CHANGES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.myChangesTitle',
  {
    defaultMessage: 'My changes',
  }
);

export const MY_CHANGES_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.myChangesExplanation',
  {
    defaultMessage: `view what you have changed in your installed rule and in the {finalUpdateSectionLabel} section`,
    values: {
      finalUpdateSectionLabel: FINAL_UPDATE,
    },
  }
);

export const MY_CHANGES_IN_RULE_UPGRADE_WORKFLOW_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.myChangesFinalUpdateOnlyExplanation',
  {
    defaultMessage: `view the changes you made in the {finalUpdateSectionLabel} section`,
    values: {
      finalUpdateSectionLabel: FINAL_UPDATE,
    },
  }
);

export const MERGED_CHANGES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.mergedChangesTitle',
  {
    defaultMessage: 'My changes merged with Elastic’s',
  }
);

export const MERGED_CHANGES_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.mergedChangesExplanation',
  {
    defaultMessage: 'view an update suggestion that combines your changes with Elastic’s',
  }
);

export const MY_ORIGINAL_CHANGES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.myOriginalChangesTitle',
  {
    defaultMessage: 'My original changes',
  }
);

export const MY_ORIGINAL_CHANGES_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.myCustomizationExplanation',
  {
    defaultMessage: `view what you have changed in your installed rule. Doesn’t include changes made in the {finalUpdateSectionLabel} section.`,
    values: {
      finalUpdateSectionLabel: FINAL_UPDATE,
    },
  }
);
