/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiResizableContainer,
  useEuiTheme,
} from '@elastic/eui';
import {
  RULES_TABLE_FILTERS_SIDEBAR_DEFAULT_WIDTH_PERCENT,
  RULES_TABLE_FILTERS_SIDEBAR_MIN_WIDTH_PERCENT,
} from '../constants';
import * as i18n from '../translations';
import { CLEAR_RULES_TABLE_FILTERS } from '../../../../common/translations';

const RULES_TABLE_FILTERS_SIDEBAR_PANEL_ID = 'rulesTableFiltersSidebar';

export interface RulesTableFiltersLayoutProps {
  /** Search bar rendered at the top of the main content area (beside the sidebar) */
  searchBar: React.ReactNode;
  /** Filter controls rendered in the left sidebar */
  sidebarContent: React.ReactNode;
  /** Main content (e.g. utility bar + table) */
  children: React.ReactNode;
  /** Called when the user clicks Clear to reset all filters to initial state */
  onClearFilters?: () => void;
}

export const RulesTableFiltersLayout = React.memo<RulesTableFiltersLayoutProps>(
  function RulesTableFiltersLayout({ searchBar, sidebarContent, children, onClearFilters }) {
    const { euiTheme } = useEuiTheme();
    const [sidebarWidthPercent, setSidebarWidthPercent] = useState(
      RULES_TABLE_FILTERS_SIDEBAR_DEFAULT_WIDTH_PERCENT
    );

    const onPanelWidthChange = useCallback((sizes: Record<string, number>) => {
      const size = sizes[RULES_TABLE_FILTERS_SIDEBAR_PANEL_ID];
      if (size != null && Number.isFinite(size)) {
        setSidebarWidthPercent(size);
      }
    }, []);

    const mainPanelSizePercent = useMemo(() => 100 - sidebarWidthPercent, [sidebarWidthPercent]);

    const sidebarBorderStyle = useMemo(
      () => ({
        borderRight: `1px solid ${euiTheme.border.color}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        minHeight: 0,
      }),
      [euiTheme.border.color]
    );

    const sidebarContentPaddingStyle = useMemo(
      () => ({
        padding: euiTheme.size.m,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        flexGrow: 1,
        minWidth: 0,
      }),
      [euiTheme.size.m]
    );

    const mainContentPaddingStyle = useMemo(
      () => ({
        paddingLeft: euiTheme.size.m,
        paddingBottom: euiTheme.size.l,
        minHeight: 0,
        height: '100%',
      }),
      [euiTheme.size.m, euiTheme.size.l]
    );

    return (
      <EuiResizableContainer
        direction="horizontal"
        onPanelWidthChange={onPanelWidthChange}
        data-test-subj="rulesTableFiltersLayout"
        style={{ minHeight: 0 }}
      >
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              id={RULES_TABLE_FILTERS_SIDEBAR_PANEL_ID}
              size={sidebarWidthPercent}
              initialSize={sidebarWidthPercent}
              minSize={`${RULES_TABLE_FILTERS_SIDEBAR_MIN_WIDTH_PERCENT}%`}
              scrollable={true}
              paddingSize="none"
              data-test-subj="rulesTableFiltersSidebar"
              wrapperProps={{
                style: sidebarBorderStyle,
              }}
            >
              <EuiFlexGroup
                direction="column"
                gutterSize="m"
                responsive={false}
                style={sidebarContentPaddingStyle}
              >
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="spaceBetween"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="filter" size="m" aria-hidden={true} />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <span>{i18n.FILTER_SIDEBAR_TITLE}</span>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    {onClearFilters != null && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          onClick={onClearFilters}
                          data-test-subj="rulesTableFiltersSidebarClearButton"
                        >
                          {CLEAR_RULES_TABLE_FILTERS}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={true} style={{ minHeight: 0, overflow: 'auto' }}>
                  {sidebarContent}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiResizablePanel>
            <EuiResizableButton />
            <EuiResizablePanel
              id="rulesTableFiltersMain"
              size={mainPanelSizePercent}
              initialSize={mainPanelSizePercent}
              minSize="20%"
              scrollable={false}
              paddingSize="none"
              data-test-subj="rulesTableFiltersMainContent"
            >
              <EuiFlexGroup
                direction="column"
                gutterSize="s"
                style={{ ...mainContentPaddingStyle, flexGrow: 1 }}
              >
                <EuiFlexItem grow={false}>{searchBar}</EuiFlexItem>
                <EuiFlexItem grow={true} style={{ minHeight: 0 }}>
                  {children}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    );
  }
);

RulesTableFiltersLayout.displayName = 'RulesTableFiltersLayout';
