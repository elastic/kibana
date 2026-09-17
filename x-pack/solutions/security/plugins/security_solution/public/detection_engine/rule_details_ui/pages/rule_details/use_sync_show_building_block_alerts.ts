/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataTableSelectors, TableId } from '@kbn/securitysolution-data-table';
import { useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { useDataTableFilters } from '../../../../common/hooks/use_data_table_filters';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';

interface SyncShowBuildingBlockAlertsProps {
  isBuildingBlockRule: boolean;
}

/**
 * Applies the building-block alerts filter once the rule-details table exists in the store.
 */
export const useSyncShowBuildingBlockAlerts = (isBuildingBlockRule: boolean): void => {
  const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
  const hasAlertsTableState = useShallowEqualSelector(
    (state) => getTable(state, TableId.alertsOnRuleDetailsPage) != null
  );
  const { setShowBuildingBlockAlerts } = useDataTableFilters(TableId.alertsOnRuleDetailsPage);

  useEffect(() => {
    if (!hasAlertsTableState) {
      return;
    }
    setShowBuildingBlockAlerts(isBuildingBlockRule);
  }, [hasAlertsTableState, isBuildingBlockRule, setShowBuildingBlockAlerts]);
};

/**
 * Runs the building-block alerts filter sync only while the Alerts tab is mounted.
 */
export const SyncShowBuildingBlockAlerts: FC<SyncShowBuildingBlockAlertsProps> = ({
  isBuildingBlockRule,
}) => {
  useSyncShowBuildingBlockAlerts(isBuildingBlockRule);
  return null;
};
