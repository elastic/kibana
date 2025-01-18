/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export { SERVICE_PROVIDER, TASK_TYPE } from '../../../../common/translations';

export const EMPTY_FILTER_MESSAGE = i18n.translate(
  'xpack.searchInferenceEndpoints.filter.emptyMessage',
  {
    defaultMessage: 'No options',
  }
);
export const OPTIONS = (totalCount: number) =>
  i18n.translate('xpack.searchInferenceEndpoints.filter.options', {
    defaultMessage: '{totalCount, plural, one {# option} other {# options}}',
    values: { totalCount },
  });
