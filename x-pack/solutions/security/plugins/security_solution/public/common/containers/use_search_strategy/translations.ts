/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FactoryQueryTypes } from '../../../../common/search_strategy';

export const DEFAULT_ERROR_SEARCH_STRATEGY = (factoryQueryType: FactoryQueryTypes) =>
  i18n.translate('xpack.securitySolution.searchStrategy.error', {
    values: { factoryQueryType },
    defaultMessage: `Failed to run search: {factoryQueryType}`,
  });

export const INVALID_RESPONSE_WARNING_SEARCH_STRATEGY = (factoryQueryType: FactoryQueryTypes) =>
  i18n.translate('xpack.securitySolution.searchStrategy.warning', {
    values: { factoryQueryType },
    defaultMessage: `An error has occurred running search: {factoryQueryType}`,
  });
