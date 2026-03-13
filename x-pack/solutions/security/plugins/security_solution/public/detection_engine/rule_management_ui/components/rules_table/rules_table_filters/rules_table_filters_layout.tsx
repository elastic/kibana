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
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  RULES_TABLE_FILTERS_MAIN_PANEL_MIN_WIDTH_PERCENT,
  RULES_TABLE_FILTERS_SIDEBAR_DEFAULT_WIDTH_PERCENT,
  RULES_TABLE_FILTERS_SIDEBAR_MIN_WIDTH_PERCENT,
} from '../constants';
import * as i18n from '../translations';
import { CLEAR_RULES_TABLE_FILTERS } from '../../../../common/translations';

const RULES_TABLE_FILTERS_SIDEBAR_PANEL_ID = 'rulesTableFiltersSidebar';
const RULES_TABLE_FILTERS_MAIN_PANEL_ID = 'rulesTableFiltersMain';

export interface RulesTableFiltersLayoutProps {
  /** Filter controls rendered in the left sidebar */
  sidebarContent: React.ReactNode;
  /** Main content (e.g. utility bar + table) */
  children: React.ReactNode;
  /** Called when the user clicks Clear to reset all filters to initial state */
  onClearFilters?: () => void;
}

export const RulesTableFiltersLayout = React.memo<RulesTableFiltersLayoutProps>(
  function RulesTableFiltersLayout({ sidebarContent, children, onClearFilters }) {
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

    return (
      <EuiResizableContainer
        direction="horizontal"
        onPanelWidthChange={onPanelWidthChange}
        data-test-subj="rulesTableFiltersLayout"
        style={{ padding: 0, height: '100%' }}
      >
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              id={RULES_TABLE_FILTERS_SIDEBAR_PANEL_ID}
              size={sidebarWidthPercent}
              initialSize={sidebarWidthPercent}
              minSize={`${RULES_TABLE_FILTERS_SIDEBAR_MIN_WIDTH_PERCENT}%`}
              scrollable={true}
              paddingSize="m"
              data-test-subj="rulesTableFiltersSidebar"
              style={{ paddingLeft: 0, height: '100%' }}
            >
              <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
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
                          <EuiIcon type="transitionLeftOut" size="xl" aria-hidden={true} />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiTitle size="m">
                            <span>{i18n.FILTER_SIDEBAR_TITLE}</span>
                          </EuiTitle>
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
                          <EuiText size="xs" color="subdued">
                            {CLEAR_RULES_TABLE_FILTERS}
                          </EuiText>
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
            <EuiResizableButton
              indicator="border"
              style={{ height: 'stretch' }}
              alignIndicator="start"
            />
            <EuiResizablePanel
              id={RULES_TABLE_FILTERS_MAIN_PANEL_ID}
              size={mainPanelSizePercent}
              initialSize={mainPanelSizePercent}
              minSize={`${RULES_TABLE_FILTERS_MAIN_PANEL_MIN_WIDTH_PERCENT}%`}
              paddingSize="m"
              style={{ paddingBottom: 0, minHeight: 400 }}
              data-test-subj="rulesTableFiltersMainContent"
            >
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={true}>{children}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    );
  }
);

RulesTableFiltersLayout.displayName = 'RulesTableFiltersLayout';
