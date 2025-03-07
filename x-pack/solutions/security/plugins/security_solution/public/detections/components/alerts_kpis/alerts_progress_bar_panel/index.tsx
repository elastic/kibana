/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { StackByComboBox } from '../common/components';
import { AlertsProgressBar } from './alerts_progress_bar';
import { useSummaryChartData } from '../alerts_summary_charts_panel/use_summary_chart_data';
import { alertsGroupingAggregations } from '../alerts_summary_charts_panel/aggregations';
import { getIsAlertsProgressBarData } from './helpers';
import * as i18n from './translations';
import type { GroupBySelection } from './types';
import type { AddFilterProps } from '../common/types';

const TOP_ALERTS_CHART_ID = 'alerts-summary-top-alerts';
const DEFAULT_COMBOBOX_WIDTH = 150;
const DEFAULT_OPTIONS = ['host.name', 'user.name', 'source.ip', 'destination.ip'];

interface AlertsProgressBarPanelProps {
  filters?: Filter[];
  query?: Query;
  signalIndexName: string | null;
  runtimeMappings?: MappingRuntimeFields;
  skip?: boolean;
  groupBySelection: GroupBySelection;
  setGroupBySelection: (groupBySelection: GroupBySelection) => void;
  /**
   * If true, render the StackComboBox to allow users to change the grouping
   */
  showGroupBySelection?: boolean;
  addFilter?: ({ field, value, negate }: AddFilterProps) => void;
  /**
   * If true, render the last column for cell actions (like filter for, out, add to timeline, copy...)
   */
  showCellActions?: boolean;
}

export const AlertsProgressBarPanel: React.FC<AlertsProgressBarPanelProps> = ({
  filters,
  query,
  signalIndexName,
  runtimeMappings,
  skip,
  groupBySelection,
  setGroupBySelection,
  showGroupBySelection = true,
  addFilter,
  showCellActions = true,
}) => {
  const uniqueQueryId = useMemo(() => `${TOP_ALERTS_CHART_ID}-${uuid()}`, []);
  const dropDownOptions = DEFAULT_OPTIONS.map((field) => {
    return { value: field, label: field };
  });
  const aggregations = useMemo(
    () => alertsGroupingAggregations(groupBySelection),
    [groupBySelection]
  );
  const onSelect = useCallback(
    (field: string) => {
      setGroupBySelection(field as GroupBySelection);
    },
    [setGroupBySelection]
  );

  const { items, isLoading } = useSummaryChartData({
    aggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip,
    uniqueQueryId,
  });
  const data = useMemo(() => (getIsAlertsProgressBarData(items) ? items : []), [items]);

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="alerts-progress-bar-panel">
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={`${i18n.ALERT_BY_TITLE} ${groupBySelection}`}
          outerDirection="row"
          title={i18n.ALERT_BY_TITLE}
          titleSize="xs"
          hideSubtitle
        >
          {showGroupBySelection && (
            <StackByComboBox
              data-test-subj="stackByComboBox"
              selected={groupBySelection}
              onSelect={onSelect}
              prepend={''}
              width={DEFAULT_COMBOBOX_WIDTH}
              dropDownoptions={dropDownOptions}
            />
          )}
        </HeaderSection>
        <AlertsProgressBar
          data={data}
          isLoading={isLoading}
          groupBySelection={groupBySelection}
          addFilter={addFilter}
          showCellActions={showCellActions}
        />
      </EuiPanel>
    </InspectButtonContainer>
  );
};

AlertsProgressBarPanel.displayName = 'AlertsProgressBarPanel';
