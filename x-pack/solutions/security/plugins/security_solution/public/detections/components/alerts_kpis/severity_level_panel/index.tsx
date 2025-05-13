/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type { ChartsPanelProps } from '../alerts_summary_charts_panel/types';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useSummaryChartData } from '../alerts_summary_charts_panel/use_summary_chart_data';
import { severityAggregations } from '../alerts_summary_charts_panel/aggregations';
import { getIsAlertsBySeverityData } from './helpers';
import { SeverityLevelChart } from './severity_level_chart';
import * as i18n from './translations';

const SEVERITY_DONUT_CHART_ID = 'alerts-summary-severity-donut';

/**
 * Renders a table and a donut chart showing alerts grouped by severity levels.
 * The component is used in the alerts page as well as in the AI for SOC alert summary page.
 */
export const SeverityLevelPanel: React.FC<ChartsPanelProps> = ({
  filters,
  query,
  signalIndexName,
  runtimeMappings,
  addFilter,
  skip,
  showCellActions = true,
}) => {
  const uniqueQueryId = useMemo(() => `${SEVERITY_DONUT_CHART_ID}-${uuid()}`, []);

  const { items, isLoading } = useSummaryChartData({
    aggregations: severityAggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip,
    uniqueQueryId,
  });
  const data = useMemo(() => (getIsAlertsBySeverityData(items) ? items : []), [items]);
  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="severty-level-panel">
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={i18n.SEVERITY_LEVELS_TITLE}
          outerDirection="row"
          title={i18n.SEVERITY_LEVELS_TITLE}
          titleSize="xs"
          hideSubtitle
        />
        <SeverityLevelChart
          data={data}
          isLoading={isLoading}
          addFilter={addFilter}
          showCellActions={showCellActions}
        />
      </EuiPanel>
    </InspectButtonContainer>
  );
};

SeverityLevelPanel.displayName = 'SeverityLevelPanel';
