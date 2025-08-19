/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SeverityLevelPanel } from '../../alerts_kpis/severity_level_panel';
import { AlertsByRulePanel } from '../../alerts_kpis/alerts_by_rule_panel';
import { AlertsProgressBarByHostNamePanel } from './alerts_progress_bar_by_host_name_panel';

export const KPIS_SECTION = 'alert-summary-kpis-section';

export interface KPIsSectionProps {
  /**
   * Index name of the signal index
   */
  signalIndexName: string;
}

/**
 * Section rendering 3 charts in the alert summary page.
 * The component leverages existing chart components from the alerts page but is making a few tweaks:
 * - the SeverityLevelPanel and AlertsByRulePanel are used directly from the alerts page
 * - the UI differences on the AlertsProgressBarPanel were significant enough that a separate component was created
 */
export const KPIsSection = memo(({ signalIndexName }: KPIsSectionProps) => {
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);

  const getGlobalFiltersSelector = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const filters = useDeepEqualSelector(getGlobalFiltersSelector);

  return (
    <EuiFlexGroup data-test-subj={KPIS_SECTION}>
      <EuiFlexItem>
        <SeverityLevelPanel
          filters={filters}
          signalIndexName={signalIndexName}
          query={query}
          showCellActions={false}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertsByRulePanel
          filters={filters}
          signalIndexName={signalIndexName}
          query={query}
          showCellActions={false}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertsProgressBarByHostNamePanel
          filters={filters}
          signalIndexName={signalIndexName}
          query={query}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

KPIsSection.displayName = 'KPIsSection';
