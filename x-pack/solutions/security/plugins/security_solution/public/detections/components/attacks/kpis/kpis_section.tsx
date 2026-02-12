/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { KpiPanel } from '../../alerts_kpis/common/components';
import { KpiCollapse } from './kpi_collapse/kpi_collapse';
import { KpiViewSelect } from './kpi_view_select/kpi_view_select';
import { KpiViewSelection } from './kpi_view_select/helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store/inputs';
import type { AssigneesIdsSelection } from '../../../../common/components/assignees/types';
import { buildAlertAssigneesFilter } from '../../alerts_table/default_config';
import { buildConnectorIdFilter } from '../table/filtering_configs';
import { SummaryViewContent } from './summary_view_content';

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
    const [kpiViewSelection, setKpiViewSelection] = useState<KpiViewSelection>(
      KpiViewSelection.Summary
    );

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
      [isExpanded, kpiViewSelection]
    );

    const content = useMemo(() => {
      if (!isExpanded) {
        return null;
      }
      if (kpiViewSelection === KpiViewSelection.Summary) {
        return <SummaryViewContent filters={filters} query={query} dataView={dataView} />;
      }
      // Other views are empty in this PR - content will be added in a follow-up PR
      return <EuiFlexItem />;
    }, [isExpanded, kpiViewSelection, filters, query, dataView]);

    return (
      <KpiPanel
        data-test-subj={KPIS_SECTION}
        hasBorder
        paddingSize="m"
        $toggleStatus={isExpanded}
        height={375}
      >
        <HeaderSection
          alignHeader="flexStart"
          hideSubtitle
          title={title}
          titleSize={'s'}
          toggleStatus={isExpanded}
          toggleQuery={setIsExpanded}
        />
        {content}
      </KpiPanel>
    );
  }
);

KPIsSection.displayName = 'KPIsSection';
