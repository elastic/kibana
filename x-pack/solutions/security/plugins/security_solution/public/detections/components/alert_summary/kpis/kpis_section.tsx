/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import type { AddFilterProps } from '../../alerts_kpis/common/types';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { GroupBySelection } from '../../alerts_kpis/alerts_progress_bar_panel/types';
import { SeverityLevelPanel } from '../../alerts_kpis/severity_level_panel';
import { AlertsByRulePanel } from '../../alerts_kpis/alerts_by_rule_panel';
import { AlertsProgressBarPanel } from '../../alerts_kpis/alerts_progress_bar_panel';

const groupBySelection: GroupBySelection = 'host.name';

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
  const setGroupBySelection = () => {};

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);

  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;

  const addFilter = useCallback(
    ({ field, value, negate }: AddFilterProps) => {
      filterManager.addFilters([
        {
          meta: {
            alias: null,
            disabled: false,
            negate: negate ?? false,
          },
          ...(value != null
            ? { query: { match_phrase: { [field]: value } } }
            : { exists: { field } }),
        },
      ]);
    },
    [filterManager]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <SeverityLevelPanel signalIndexName={signalIndexName} query={query} addFilter={addFilter} />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertsByRulePanel signalIndexName={signalIndexName} query={query} />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertsProgressBarPanel
          signalIndexName={signalIndexName}
          groupBySelection={groupBySelection}
          query={query}
          setGroupBySelection={setGroupBySelection}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

KPIsSection.displayName = 'KPIsSection';
