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
    defaultMessage: 'Changes from Elastic',
  }
);

export const UPDATE_FROM_ELASTIC_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.updateFromElasticExplanation',
  {
    defaultMessage:
      "Compare the field's original value with changes from the Elastic update. Your changes aren't displayed.",
  }
);

export const MY_CHANGES_AND_FINAL_UPDATES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.myChangesAndFinalUpdatesTitle',
  {
    defaultMessage: 'My changes and final updates',
  }
);

export const MY_CHANGES_AND_FINAL_UPDATES_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.myChangesAndFinalUpdatesExplanation',
  {
    defaultMessage:
      "Compare the field's original value with your changes or changes made in the {finalUpdateSectionLabel} section.",
    values: {
      finalUpdateSectionLabel: FINAL_UPDATE,
    },
  }
);

export const MERGED_CHANGES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.mergedChangesTitle',
  {
    defaultMessage: "My changes merged with Elastic's",
  }
);

export const MERGED_CHANGES_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.mergedChangesExplanation',
  {
    defaultMessage:
      "Compare the field's original value with a version that combines your changes with those in the Elastic update. This version is only a suggestion.",
  }
);

export const MY_ORIGINAL_CHANGES_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.myOriginalChangesTitle',
  {
    defaultMessage: 'My changes only',
  }
);

export const MY_ORIGINAL_CHANGES_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.myOriginalChangesExplanation',
  {
    defaultMessage:
      "Compare the field's original value with your changes. Modifications in the {finalUpdateSectionLabel} section aren't displayed.",
    values: {
      finalUpdateSectionLabel: FINAL_UPDATE,
    },
  }
);

export const DIFF_FORMAT_AND_COLORS_EXPLANATION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.diffFormatAndColorsExplanation',
  {
    defaultMessage:
      "Differences are shown in JSON and color-coded or bolded. Lines that are highlighted in green were added. Lines that are highlighted in red were removed. Text that's bolded was changed.",
  }
);

export const VERSION_COMPARISON_HELP_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.versions.versionComparisonHelpAriaLabel',
  {
    defaultMessage: 'Version comparison help',
  }
);
