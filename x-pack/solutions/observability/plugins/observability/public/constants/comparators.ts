/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Comparator } from '@kbn/alerting-comparators';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { i18n } from '@kbn/i18n';
import { builtInComparators } from '@kbn/triggers-actions-ui-plugin/public';

export const builtInComparatorsWithInclusive: { [key: string]: Comparator } = {
  ...builtInComparators,
  [COMPARATORS.BETWEEN_INCLUSIVE]: {
    text: i18n.translate('xpack.observability.comparators.isBetweenInclusiveLabel', {
      defaultMessage: 'Is between (inclusive)',
    }),
    value: COMPARATORS.BETWEEN_INCLUSIVE,
    requiredValues: 2,
  },
  [COMPARATORS.NOT_BETWEEN_INCLUSIVE]: {
    text: i18n.translate('xpack.observability.comparators.isNotBetweenInclusiveLabel', {
      defaultMessage: 'Is not between (inclusive)',
    }),
    value: COMPARATORS.NOT_BETWEEN_INCLUSIVE,
    requiredValues: 2,
  },
};
