/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useLatestStats as useLatestStatsBase } from '../../../common/service';

export const useLatestStats = () => {
  const { siemMigrations } = useKibana().services;

  const result = useLatestStatsBase(siemMigrations.dashboards);

  return result;
};
