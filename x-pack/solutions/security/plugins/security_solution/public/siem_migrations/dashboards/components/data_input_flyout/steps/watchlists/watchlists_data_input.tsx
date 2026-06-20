/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  WatchlistsDataInput as CommonWatchlistsDataInput,
  WATCHLISTS_DATA_INPUT_DESCRIPTION_DASHBOARDS,
  type WatchlistsLookupsSubStepsProps,
} from '../../../../../common/components/watchlists_data_input';
import type { MigrationStepProps } from '../../../../../common/types';
import type { DashboardMigrationStats } from '../../../../types';
import { LookupsDataInputSubSteps } from '../lookups/lookups_data_input';
import { SentinelDashboardDataInputStep } from '../constants';

export const WatchlistsDataInput = React.memo<MigrationStepProps>(
  ({ dataInputStep, migrationStats, missingResourcesIndexed, setDataInputStep }) => {
    const missingLookups = useMemo(
      () => missingResourcesIndexed?.lookups,
      [missingResourcesIndexed]
    );

    const renderLookupsSubSteps = useCallback(
      ({
        migrationStats: stats,
        missingLookups: lookups,
        onAllLookupsCreated,
      }: WatchlistsLookupsSubStepsProps<DashboardMigrationStats>) => (
        <LookupsDataInputSubSteps
          migrationStats={stats}
          missingLookups={lookups}
          onAllLookupsCreated={onAllLookupsCreated}
        />
      ),
      []
    );

    return (
      <CommonWatchlistsDataInput<DashboardMigrationStats>
        dataInputStep={dataInputStep}
        stepNumber={SentinelDashboardDataInputStep.Watchlists}
        endStepNumber={SentinelDashboardDataInputStep.End}
        migrationStats={migrationStats as DashboardMigrationStats | undefined}
        missingLookups={missingLookups}
        setDataInputStep={setDataInputStep}
        renderLookupsSubSteps={renderLookupsSubSteps}
        description={WATCHLISTS_DATA_INPUT_DESCRIPTION_DASHBOARDS}
      />
    );
  }
);
WatchlistsDataInput.displayName = 'WatchlistsDataInput';
