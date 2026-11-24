/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RulesFacetPanel } from '../../../rule_sets/facets/rules_facet_panel';
import { RuleSetEditorProvider } from '../../../rule_sets/components/rule_set_editor_context';
import { RuleSetHeader } from '../../../rule_sets/components/rule_set_header';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useSyncRulesTableSavedState } from './rules_table/use_sync_rules_table_saved_state';
import { RulesTables } from './rules_tables';
import { AllRulesTabs } from './constants';
import { UpgradePrebuiltRulesTable } from './upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table';
import { UpgradePrebuiltRulesTableContextProvider } from './upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table_context';
import { RuleGapsCallout } from '../../../rule_gaps/components/rule_gaps_callout';
import { GapSchedulerErrorsCallout } from '../../../rule_gaps/components/gap_scheduler_errors_callout';

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Import/Export
 */
export const AllRules = React.memo(() => {
  useSyncRulesTableSavedState();
  const [{ tabName }] = useRouteSpy();

  if (tabName !== AllRulesTabs.updates) {
    return (
      <RuleSetEditorProvider>
        {tabName !== AllRulesTabs.monitoring && <RuleGapsCallout />}
        <GapSchedulerErrorsCallout />
        <RuleSetHeader />
        <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
          <EuiFlexItem
            grow={false}
            // Sticky with its own scroll, so the facets stay in view next to a long table.
            css={{
              width: 260,
              position: 'sticky',
              top: 'calc(var(--euiFixedHeadersOffset, 0px) + 8px)',
              maxHeight: 'calc(100vh - var(--euiFixedHeadersOffset, 0px) - 16px)',
              overflowY: 'auto',
            }}
          >
            <RulesFacetPanel />
          </EuiFlexItem>
          <EuiFlexItem css={{ minWidth: 0 }}>
            <RulesTables selectedTab={tabName as AllRulesTabs} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </RuleSetEditorProvider>
    );
  } else {
    return (
      <UpgradePrebuiltRulesTableContextProvider>
        <UpgradePrebuiltRulesTable />
      </UpgradePrebuiltRulesTableContextProvider>
    );
  }
});

AllRules.displayName = 'AllRules';
