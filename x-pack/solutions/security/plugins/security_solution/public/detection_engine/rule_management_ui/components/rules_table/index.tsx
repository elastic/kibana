/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RulesFacetPanel } from '../../../rule_sets/facets/rules_facet_panel';
import { useRuleSetDraft } from '../../../rule_sets/components/use_rule_set_draft';
import {
  FacetPanelVisibilityProvider,
  useFacetPanelVisibility,
} from '../../../rule_sets/facets/facet_panel_visibility';
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
/**
 * Space below the table that the panel must not cover: the Timeline bar of Security pages is
 * sticky at the bottom (57 px) and is not in the Kibana layout variables, plus the page padding.
 */
const BOTTOM_SPACE = '80px';

/**
 * Height of the sticky app header (title and tabs). It covers the top of the scroll container and
 * has no layout variable, so the panel measures it.
 */
const useStickyAppHeaderHeight = () => {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-test-subj="appHeader"]');
    if (!header || getComputedStyle(header).position !== 'sticky') {
      return;
    }
    const observer = new ResizeObserver(() => setHeight(header.getBoundingClientRect().height));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return height;
};

/**
 * Facets left, table right. The panel sticks below the Kibana headers and fits the visible part of
 * the application, so it stays in view while the table scrolls; a long panel scrolls on its own.
 */
const RulesWithFacets = ({ selectedTab }: { selectedTab: AllRulesTabs }) => {
  const { isOpen } = useFacetPanelVisibility();
  const headerHeight = useStickyAppHeaderHeight();
  useRuleSetDraft();
  const offset = `(var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0px)) + ${headerHeight}px)`;
  return (
    <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
      {isOpen && (
        <EuiFlexItem
          grow={false}
          css={{
            width: 260,
            position: 'sticky',
            top: `calc(${offset} + 8px)`,
            maxHeight: `calc(var(--kbn-application--content-height, 100vh) - ${offset} - 8px - ${BOTTOM_SPACE})`,
            overflowY: 'auto',
          }}
        >
          <RulesFacetPanel />
        </EuiFlexItem>
      )}
      <EuiFlexItem css={{ minWidth: 0, position: 'relative' }}>
        <RulesTables selectedTab={selectedTab} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const AllRules = React.memo(() => {
  useSyncRulesTableSavedState();
  const [{ tabName }] = useRouteSpy();

  if (tabName !== AllRulesTabs.updates) {
    return (
      <RuleSetEditorProvider>
        {tabName !== AllRulesTabs.monitoring && <RuleGapsCallout />}
        <GapSchedulerErrorsCallout />
        <RuleSetHeader />
        <FacetPanelVisibilityProvider>
          <RulesWithFacets selectedTab={tabName as AllRulesTabs} />
        </FacetPanelVisibilityProvider>
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
