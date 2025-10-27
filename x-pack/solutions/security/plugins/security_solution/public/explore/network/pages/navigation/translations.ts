/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DOMAINS_COUNT_BY = (groupByField: string) =>
  i18n.translate('xpack.securitySolution.network.dns.stackByUniqueSubdomain', {
    values: { groupByField },
    defaultMessage: 'Top domains by {groupByField}',
  });
