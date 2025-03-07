/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { GroupBySelection } from '../../alerts_kpis/alerts_progress_bar_panel/types';
import { SeverityLevelPanel } from '../../alerts_kpis/severity_level_panel';
import { AlertsByRulePanel } from '../../alerts_kpis/alerts_by_rule_panel';
import { AlertsProgressBarPanel } from '../../alerts_kpis/alerts_progress_bar_panel';

const groupBySelection: GroupBySelection = 'host.name';
const setGroupBySelection = () => {};

export interface KPIsSectionProps {
  /**
   *
   */
  dataView: DataView;
}

/**
 *
 */
export const KPIsSection = memo(({ dataView }: KPIsSectionProps) => {
  const signalIndexName = dataView.getIndexPattern();

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <SeverityLevelPanel
          signalIndexName={signalIndexName}
          query={query}
          showCellActions={false}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertsByRulePanel
          signalIndexName={signalIndexName}
          query={query}
          showCellActions={false}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertsProgressBarPanel
          signalIndexName={signalIndexName}
          groupBySelection={groupBySelection}
          query={query}
          setGroupBySelection={setGroupBySelection}
          showGroupBySelection={false}
          showCellActions={false}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

KPIsSection.displayName = 'KPIsSection';
