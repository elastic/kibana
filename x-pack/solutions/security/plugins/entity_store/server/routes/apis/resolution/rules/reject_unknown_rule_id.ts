/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core-http-server';
import { RESOLUTION_RULE_CONFIGS } from '../../../../maintainers/automated_resolution/rule_config';

/**
 * Shared guard for the enable/disable routes: returns a 404 response when `id` is
 * not a defined resolution rule, or `undefined` when it is. Keeps both routes'
 * validation and error message in one place so they cannot drift.
 */
export const rejectUnknownRuleId = (
  id: string,
  res: KibanaResponseFactory
): IKibanaResponse | undefined => {
  if (RESOLUTION_RULE_CONFIGS.some((rule) => rule.id === id)) {
    return undefined;
  }

  return res.notFound({
    body: {
      message: i18n.translate('xpack.entityStore.resolution.rules.notDefinedErrorMessage', {
        defaultMessage: "Resolution rule ''{id}'' is not defined",
        values: { id },
      }),
    },
  });
};
