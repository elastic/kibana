/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiText } from '@elastic/eui';
import type { KpiViewSelection } from '../kpi_view_select/helpers';
import * as i18n from '../kpi_view_select/translations';

export interface KpiCollapseProps {
  kpiViewSelection: KpiViewSelection;
}

const getViewLabel = (view: KpiViewSelection): string => {
  switch (view) {
    case 'summary':
      return i18n.SUMMARY;
    case 'trend':
      return i18n.TREND;
    case 'count':
      return i18n.COUNT;
    case 'treemap':
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
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      <EuiText size="s" data-test-subj="kpi-collapse-view-label">
        {getViewLabel(kpiViewSelection)}
      </EuiText>
    </EuiFlexGroup>
  );
});

KpiCollapse.displayName = 'KpiCollapse';
