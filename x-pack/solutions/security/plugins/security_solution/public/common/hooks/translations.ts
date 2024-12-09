/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADDED_TO_TIMELINE_MESSAGE = (fieldOrValue: string) =>
  i18n.translate('xpack.securitySolution.hooks.useAddToTimeline.addedFieldMessage', {
    values: { fieldOrValue },
    defaultMessage: `Added {fieldOrValue} to timeline`,
  });

export const ADDED_TO_TIMELINE_TEMPLATE_MESSAGE = (fieldOrValue: string) =>
  i18n.translate('xpack.securitySolution.hooks.useAddToTimeline.template.addedFieldMessage', {
    values: { fieldOrValue },
    defaultMessage: `Added {fieldOrValue} to timeline template`,
  });

export const INDEX_PATTERN_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.components.mlPopup.hooks.errors.indexPatternFetchFailureTitle',
  {
    defaultMessage: 'Index pattern fetch failure',
  }
);

export const EQL_PREVIEW_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.components.hooks.eql.partialResponse',
  {
    defaultMessage: 'EQL Preview Error',
  }
);

export const EQL_TIME_INTERVAL_NOT_DEFINED = i18n.translate(
  'xpack.securitySolution.components.hooks.errors.timeIntervalsNotDefined',
  {
    defaultMessage: 'Time intervals are not defined.',
  }
);
