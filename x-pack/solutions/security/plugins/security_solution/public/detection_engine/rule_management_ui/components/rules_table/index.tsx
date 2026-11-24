/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableButton,
  EuiToolTip,
} from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import React, { useCallback, useState } from 'react';
import { RuleGroupEditorProvider } from '../../../rule_groups/components/rule_group_editor_context';
import { RuleGroupHeader } from '../../../rule_groups/components/rule_group_header';
import { RuleGroupsSidebar } from '../../../rule_groups/components/rule_groups_sidebar';
import { RULE_GROUPS_SHOW_SIDEBAR } from '../../../rule_groups/components/translations';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useSyncRulesTableSavedState } from './rules_table/use_sync_rules_table_saved_state';
import { RulesTables } from './rules_tables';
import { AllRulesTabs } from './constants';
import { UpgradePrebuiltRulesTable } from './upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table';
import { UpgradePrebuiltRulesTableContextProvider } from './upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table_context';
import { RuleGapsCallout } from '../../../rule_gaps/components/rule_gaps_callout';
import { GapSchedulerErrorsCallout } from '../../../rule_gaps/components/gap_scheduler_errors_callout';

const SIDEBAR_WIDTH = { default: 280, min: 200, max: 480, step: 20 };

const clampWidth = (width: number) =>
  Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, Math.round(width)));

/** The width of the rule sets list. The user drags its right border; the page remembers it. */
const useSidebarWidth = () => {
  const [savedWidth = SIDEBAR_WIDTH.default, saveWidth] = useLocalStorage<number>(
    'securitySolution.rulesTable.ruleSetsSidebarWidth',
    SIDEBAR_WIDTH.default
  );
  // While the user drags, only React state changes; local storage is written once at the end.
  const [dragWidth, setDragWidth] = useState<number>();

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      let width = savedWidth;
      const onMove = (move: MouseEvent) => {
        width = clampWidth(savedWidth + move.clientX - startX);
        setDragWidth(width);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        saveWidth(width);
        setDragWidth(undefined);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [savedWidth, saveWidth]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const delta =
        event.key === 'ArrowRight'
          ? SIDEBAR_WIDTH.step
          : event.key === 'ArrowLeft'
          ? -SIDEBAR_WIDTH.step
          : 0;
      if (delta) {
        event.preventDefault();
        saveWidth(clampWidth(savedWidth + delta));
      }
    },
    [savedWidth, saveWidth]
  );

  return { width: dragWidth ?? savedWidth, onMouseDown, onKeyDown };
};

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
  const [isSidebarOpen = true, setIsSidebarOpen] = useLocalStorage<boolean>(
    'securitySolution.rulesTable.ruleGroupsSidebarOpen',
    true
  );
  const sidebarWidth = useSidebarWidth();
  const [{ tabName }] = useRouteSpy();

  if (tabName !== AllRulesTabs.updates) {
    return (
      <RuleGroupEditorProvider>
        {tabName !== AllRulesTabs.monitoring && <RuleGapsCallout />}
        <GapSchedulerErrorsCallout />
        <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
          <EuiFlexItem
            grow={false}
            // Sticky, so the groups stay in view while the user scrolls a long table.
            css={{
              width: isSidebarOpen ? sidebarWidth.width : 'auto',
              position: 'sticky',
              top: 'calc(var(--euiFixedHeadersOffset, 0px) + 8px)',
            }}
          >
            {isSidebarOpen ? (
              <>
                <RuleGroupsSidebar onCollapse={() => setIsSidebarOpen(false)} />
                <EuiResizableButton
                  isHorizontal
                  indicator="border"
                  onMouseDown={sidebarWidth.onMouseDown}
                  onKeyDown={sidebarWidth.onKeyDown}
                  css={{ position: 'absolute', top: 0, bottom: 0, right: -12 }}
                  data-test-subj="ruleSetsSidebarResize"
                />
              </>
            ) : (
              <EuiToolTip content={RULE_GROUPS_SHOW_SIDEBAR} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="menuRight"
                  display="base"
                  aria-label={RULE_GROUPS_SHOW_SIDEBAR}
                  onClick={() => setIsSidebarOpen(true)}
                  data-test-subj="ruleGroupsSidebarExpand"
                />
              </EuiToolTip>
            )}
          </EuiFlexItem>
          <EuiFlexItem css={{ minWidth: 0 }}>
            <RuleGroupHeader />
            <RulesTables selectedTab={tabName as AllRulesTabs} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </RuleGroupEditorProvider>
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
