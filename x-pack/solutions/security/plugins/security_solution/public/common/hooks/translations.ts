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

export const ERROR_FETCH_AI_CONNECTORS = i18n.translate(
  'xpack.securitySolution.hooks.useGetAIConnectors.fetchError',
  {
    defaultMessage: 'Error fetching AI connectors',
  }
);
