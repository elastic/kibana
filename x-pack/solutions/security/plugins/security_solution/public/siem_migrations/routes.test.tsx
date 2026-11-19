/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../common';
import {
  SIEM_MIGRATIONS_DASHBOARDS_PATH,
  SIEM_MIGRATIONS_RULES_PATH,
  SIEM_MIGRATIONS_WORKFLOWS_PATH,
} from '../../common/constants';
import { getSiemMigrationsRoutes } from './routes';

const getRoutePaths = (experimentalFeatures: Partial<ExperimentalFeatures>) =>
  getSiemMigrationsRoutes({
    siemMigrationsDisabled: false,
    automaticDashboardsMigration: true,
    tinesWorkflowsMigration: true,
    ...experimentalFeatures,
  } as ExperimentalFeatures).map(({ path }) => path);

describe('getSiemMigrationsRoutes', () => {
  it('should register the translated workflows route when the tinesWorkflowsMigration flag is on', () => {
    expect(getRoutePaths({})).toContain(SIEM_MIGRATIONS_WORKFLOWS_PATH);
  });

  it('should not register the translated workflows route when the tinesWorkflowsMigration flag is off', () => {
    expect(getRoutePaths({ tinesWorkflowsMigration: false })).not.toContain(
      SIEM_MIGRATIONS_WORKFLOWS_PATH
    );
  });

  it('should not register the translated workflows route when siem migrations are disabled', () => {
    expect(getRoutePaths({ siemMigrationsDisabled: true })).toEqual([]);
  });

  it('should keep the rules and dashboards routes when the translated workflows route is off', () => {
    expect(getRoutePaths({ tinesWorkflowsMigration: false })).toEqual(
      expect.arrayContaining([SIEM_MIGRATIONS_RULES_PATH, SIEM_MIGRATIONS_DASHBOARDS_PATH])
    );
  });
});
