/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup } from '@elastic/eui';
import React, { useMemo } from 'react';
import { KpiViewSelection, getOptionProperties } from './helpers';
import * as i18n from './translations';

const KPI_VIEW_OPTIONS: KpiViewSelection[] = [
  KpiViewSelection.Summary,
  KpiViewSelection.Trend,
  KpiViewSelection.Count,
  KpiViewSelection.Treemap,
];

export interface KpiViewSelectProps {
  kpiViewSelection: KpiViewSelection;
  setKpiViewSelection: (view: KpiViewSelection) => void;
}

export const KpiViewSelect: React.FC<KpiViewSelectProps> = React.memo(
  ({ kpiViewSelection, setKpiViewSelection }) => {
    const options = useMemo(
      () => KPI_VIEW_OPTIONS.map((option) => getOptionProperties(option)),
      []
    );

    return (
      <EuiButtonGroup
        legend={i18n.LEGEND_TITLE}
        options={options}
        idSelected={kpiViewSelection}
        onChange={(id) => setKpiViewSelection(id as KpiViewSelection)}
        buttonSize="compressed"
        color="primary"
        data-test-subj="kpi-view-select-tabs"
      />
    );
  }
);
KpiViewSelect.displayName = 'KpiViewSelect';
