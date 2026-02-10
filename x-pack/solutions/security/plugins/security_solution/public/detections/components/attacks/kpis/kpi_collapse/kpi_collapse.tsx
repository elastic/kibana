/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiText } from '@elastic/eui';
import { KpiViewSelection } from '../kpi_view_select/helpers';
import * as i18n from '../kpi_view_select/translations';

export interface KpiCollapseProps {
  kpiViewSelection: KpiViewSelection;
}

const getViewLabel = (view: KpiViewSelection): string => {
  switch (view) {
    case KpiViewSelection.Summary:
      return i18n.SUMMARY;
    case KpiViewSelection.Trend:
      return i18n.TREND;
    case KpiViewSelection.Count:
      return i18n.COUNT;
    case KpiViewSelection.Treemap:
      return i18n.TREEMAP;
    default:
      return i18n.SUMMARY;
  }
};

/**
 * Collapsed header content: shows the current KPI view label (e.g. "Summary") when the panel is collapsed.
 */
export const KpiCollapse = memo(({ kpiViewSelection }: KpiCollapseProps) => {
  return (
    <EuiText size="relative" data-test-subj="kpi-collapse-view-label">
      {getViewLabel(kpiViewSelection)}
    </EuiText>
  );
});

KpiCollapse.displayName = 'KpiCollapse';
