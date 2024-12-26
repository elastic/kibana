/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LABEL = i18n.translate('xpack.securitySolution.markdown.insight.label', {
  defaultMessage: 'Label',
});

export const INVESTIGATE = i18n.translate('xpack.securitySolution.markdown.insight.title', {
  defaultMessage: 'Investigate',
});

export const LABEL_TEXT = i18n.translate('xpack.securitySolution.markdown.insight.labelText', {
  defaultMessage: 'Label on the query button.',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.markdown.insight.description', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_TEXT = i18n.translate(
  'xpack.securitySolution.markdown.insight.descriptionText',
  {
    defaultMessage: 'Additional description of the query.',
  }
);

export const FORM_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.markdown.insight.formDescription',
  {
    defaultMessage:
      'Create a query to investigate an alert in Timeline, using a clickable query button in the investigation guide. The button also displays a count of matching documents.',
  }
);

export const FILTER_BUILDER = i18n.translate(
  'xpack.securitySolution.markdown.insight.filterBuilder',
  {
    defaultMessage: 'Filters',
  }
);

export const FILTER_BUILDER_TEXT = i18n.translate(
  'xpack.securitySolution.markdown.insight.filterBuilderText',
  {
    defaultMessage:
      'Create filters to populate the Timeline query builder. To use a value from the alert document, enter the field name in double braces {example} as a custom option in the value field.',
    values: {
      example: '{{kibana.alert.example}}',
    },
  }
);

export const RELATIVE_TIMERANGE = i18n.translate(
  'xpack.securitySolution.markdown.insight.relativeTimerange',
  {
    defaultMessage: 'Relative time range',
  }
);

export const RELATIVE_TIMERANGE_TEXT = i18n.translate(
  'xpack.securitySolution.markdown.insight.relativeTimerangeText',
  {
    defaultMessage:
      "Select a time range to limit the query, relative to the alert's creation time (optional).",
  }
);

export const CANCEL_FORM_BUTTON = i18n.translate(
  'xpack.securitySolution.markdown.insight.modalCancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const PARSE_ERROR = i18n.translate(
  'xpack.securitySolution.markdownEditor.plugins.insightProviderError',
  {
    defaultMessage: 'Unable to parse insight provider configuration',
  }
);

export const INVALID_FILTER_ERROR = (err: string) =>
  i18n.translate('xpack.securitySolution.markdownEditor.plugins.insightConfigError', {
    values: { err },
    defaultMessage: 'Unable to parse insight JSON configuration: {err}',
  });
