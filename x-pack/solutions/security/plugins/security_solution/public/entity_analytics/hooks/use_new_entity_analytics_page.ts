/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';

export const useNewEntityAnalyticsPage = (): boolean => {
  const { featureFlags } = useKibana().services;
  return featureFlags.useBooleanValue(USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG, false);
};
