/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { badRequest } from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { translateKuery } from '../../../common/kuery';

/**
 * The query a KQL expression stands for, `undefined` for none. An expression that does not parse,
 * or names fields by a pattern, is the client's mistake, answered with a 400 that says what.
 */
export const kueryToQuery = (kuery?: string): estypes.QueryDslQueryContainer | undefined => {
  if (!kuery?.trim()) {
    return undefined;
  }
  const translation = translateKuery(kuery);
  if ('issue' in translation) {
    throw badRequest(
      i18n.translate('xpack.digitalExperience.api.invalidKuery', {
        defaultMessage: 'The KQL query is not valid: {reason}',
        values: { reason: translation.issue },
      })
    );
  }
  return translation.query;
};
