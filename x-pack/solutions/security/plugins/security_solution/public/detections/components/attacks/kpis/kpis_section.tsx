/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { KpiCollapse } from './kpi_collapse/kpi_collapse';
import { KpiViewSelect } from './kpi_view_select/kpi_view_select';
import { KpiViewSelection } from './kpi_view_select/helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store/inputs';
import type { AssigneesIdsSelection } from '../../../../common/components/assignees/types';
import { buildAlertAssigneesFilter } from '../../alerts_table/default_config';
import { buildConnectorIdFilter } from '../table/filtering_configs';
import { AttacksSummaryPanel } from './attacks_summary_panel';
import { AttacksTrendsPanel } from './attacks_trends_panel';
import { AttacksCountPanel } from './attacks_count_panel';
import { AttacksTreemapPanel } from './attacks_treemap_panel';
import { useAttacksKpiState } from './common/use_attacks_kpi_state';

const ATTACKS_KPI_SECTION_PANEL_ID = 'attacks-kpis-section';

export const KPIS_SECTION = 'attacks-kpis-section';

export interface KPIsSectionProps {
  /** Global page filters */
  pageFilters?: Filter[];
  /** Selected assignees to filter by */
  assignees: AssigneesIdsSelection[];
  /** Selected connector IDs to filter by */
  selectedConnectorNames: string[];
  /** DataView for the attacks page */
  dataView: DataView;
}

/**
 * Section rendering the attacks KPIs on the attacks page.
 * Supports view selection (Summary, Trends, Count, Treemap).
 */
export const KPIsSection = memo(
  ({ pageFilters, assignees, selectedConnectorNames, dataView }: KPIsSectionProps) => {
    const { toggleStatus: isExpanded, setToggleStatus: setIsExpanded } = useQueryToggle(
      ATTACKS_KPI_SECTION_PANEL_ID
    );
    const { viewSelection: kpiViewSelection, setViewSelection: setKpiViewSelection } =
      useAttacksKpiState();

    const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
    const query = useDeepEqualSelector(getGlobalQuerySelector);

    const getGlobalFiltersQuerySelector = useMemo(
      () => inputsSelectors.globalFiltersQuerySelector(),
      []
    );
    const globalFilters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

    const filters = useMemo(
      () => [
        ...(globalFilters ?? []),
        ...(pageFilters ?? []),
        ...buildAlertAssigneesFilter(assignees),
        ...buildConnectorIdFilter(selectedConnectorNames),
      ],
      [globalFilters, pageFilters, assignees, selectedConnectorNames]
    );

    const title = useMemo(
      () =>
        isExpanded ? (
          <KpiViewSelect
            kpiViewSelection={kpiViewSelection}
            setKpiViewSelection={setKpiViewSelection}
          />
        ) : (
          <KpiCollapse kpiViewSelection={kpiViewSelection} />
        ),
      [isExpanded, kpiViewSelection, setKpiViewSelection]
    );

    const baseProps = useMemo(
      () => ({ filters, title, isExpanded, setIsExpanded }),
      [filters, title, isExpanded, setIsExpanded]
    );

    const content = useMemo(() => {
      if (kpiViewSelection === KpiViewSelection.Trend) {
        return <AttacksTrendsPanel {...baseProps} />;
      }
      if (kpiViewSelection === KpiViewSelection.Count) {
        return <AttacksCountPanel {...baseProps} />;
      }
      if (kpiViewSelection === KpiViewSelection.Treemap) {
        return <AttacksTreemapPanel {...baseProps} query={query} />;
      }
      return <AttacksSummaryPanel {...baseProps} dataView={dataView} query={query} />;
    }, [kpiViewSelection, baseProps, query, dataView]);

    return content;
  }
);

KPIsSection.displayName = 'KPIsSection';
