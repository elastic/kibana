/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';

import { useRulesTableContext } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as i18n from './translations';

import { useKibana } from '../../../../common/lib/kibana';
import { AutoFillSchedulerFlyoutTrigger } from './auto_fill_scheduler_flyout_trigger';

export const RulesWithGapsOverviewPanel = () => {
  const {
    state: { lastUpdated: rulesTableLastUpdatedAt },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const [isPopoverOpen, setPopover] = useState(false);
  const telemetry = useKibana().services.telemetry;

  // Removed date range picker; always use defaultRangeValue (90d)

  // Removed: toggle to show only rules with unfilled gaps; use gap status filter instead

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="flexStart"
        gutterSize="m"
        data-test-subj="rule-with-gaps_overview-panel"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="xs">
            <EuiFlexItem>
              <EuiText>
                <b>{i18n.RULE_GAPS_OVERVIEW_PANEL_LABEL}</b>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {/* Removed filter toggle; gap status filter supersedes it */}
        <EuiFlexItem grow={false}>
          <AutoFillSchedulerFlyoutTrigger />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
