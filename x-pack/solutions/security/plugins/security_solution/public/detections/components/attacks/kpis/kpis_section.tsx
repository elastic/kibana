/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { KpiPanel } from '../../alerts_kpis/common/components';
import { KpiCollapse } from './kpi_collapse/kpi_collapse';
import { KpiViewSelect } from './kpi_view_select/kpi_view_select';
import type { KpiViewSelection } from './kpi_view_select/helpers';

const ATTACKS_KPI_SECTION_PANEL_ID = 'attacks-kpis-section';

export const KPIS_SECTION = 'attacks-kpis-section';

/**
 * Section rendering the attacks KPIs on the attacks page.
 * Supports view selection (Summary, Trends, Count, Treemap); views are empty in this PR.
 * Props (e.g. signalIndexName) will be added in a follow-up PR when KPI views are implemented.
 */
export const KPIsSection = memo(() => {
  const { toggleStatus: isExpanded, setToggleStatus: setIsExpanded } = useQueryToggle(
    ATTACKS_KPI_SECTION_PANEL_ID
  );
  const [kpiViewSelection, setKpiViewSelection] = useState<KpiViewSelection>('summary');

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
    // All views are empty in this PR - content will be added in a follow-up PR
    return <EuiFlexItem />;
  }, [isExpanded]);

  return (
    <KpiPanel data-test-subj={KPIS_SECTION} hasBorder paddingSize="m" $toggleStatus={isExpanded}>
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
});

KPIsSection.displayName = 'KPIsSection';
