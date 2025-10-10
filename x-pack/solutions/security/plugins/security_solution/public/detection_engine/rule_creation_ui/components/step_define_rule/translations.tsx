/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INDEX_HELPER_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.indicesHelperDescription',
  {
    defaultMessage:
      'Enter the pattern of Elasticsearch indices where you would like this rule to run. By default, these will include index patterns defined in Security Solution advanced settings.',
  }
);

export const RESET_DEFAULT_INDEX = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.resetDefaultIndicesButton',
  {
    defaultMessage: 'Reset to default index patterns',
  }
);

export const IMPORT_TIMELINE_QUERY = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.importTimelineQueryButton',
  {
    defaultMessage: 'Import query from saved timeline',
  }
);

export const QUERY_BAR_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldQuerBarLabel',
  {
    defaultMessage: 'Custom query',
  }
);

export const SAVED_QUERY_FORM_ROW_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.SavedQueryFormRowLabel',
  {
    defaultMessage: 'Saved query',
  }
);

export const getSavedQueryCheckboxLabel = (savedQueryName: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldShouldLoadQueryDynamicallyLabel',
    {
      defaultMessage: 'Load saved query "{savedQueryName}" dynamically on each rule execution',
      values: { savedQueryName },
    }
  );

export const getSavedQueryCheckboxLabelWithoutName = () =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldShouldLoadQueryDynamicallyLabelWithoutName',
    {
      defaultMessage: 'Load saved query dynamically on each rule execution',
    }
  );

export const SOURCE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.source',
  {
    defaultMessage: 'Source',
  }
);

export const MACHINE_LEARNING_SUPPRESSION_DISABLED_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.machineLearningSuppressionDisabledLabel',
  {
    defaultMessage: 'To enable alert suppression, start relevant Machine Learning jobs.',
  }
);

export const MACHINE_LEARNING_SUPPRESSION_INCOMPLETE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.machineLearningSuppressionIncompleteLabel',
  {
    defaultMessage:
      'This list of fields might be incomplete as some Machine Learning jobs are not running. Start all relevant jobs for a complete list.',
  }
);

export const ALERT_SUPPRESSION_FIELDS_TECH_PREVIEW_LABEL_APPEND = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.alertSuppressionTechPreviewLabelAppend',
  {
    defaultMessage: 'Optional (Technical Preview)',
  }
);

export const ALERT_SUPPRESSION_FIELDS_GA_LABEL_APPEND = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.alertSuppressionGALabelAppend',
  {
    defaultMessage: 'Optional',
  }
);
