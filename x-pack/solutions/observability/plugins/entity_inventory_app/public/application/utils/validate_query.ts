/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-service';

export const validateQuery = (
  { language, query }: Query,
  uiSettings: IUiSettingsClient
): Error | undefined => {
  if (language !== 'kuery') {
    return undefined;
  }
  try {
    fromKueryExpression(query, {
      allowLeadingWildcards: uiSettings.get(UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS),
    });
    return undefined;
  } catch (error) {
    return error;
  }
};
