/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  type CommonProps,
  EuiBeacon,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiToolTip,
  EuiTourStep,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { GraphNotificationBadge } from '../graph_notification_badge';
import {
  GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID,
  GRAPH_ACTIONS_TOGGLE_SEARCH_ID,
} from '../test_ids';
import { SHOW_SEARCH_BAR_BUTTON_TOUR_STORAGE_KEY } from '../../common/constants';
import { useGraphInteractionTool } from './graph_interaction_tool_context';
import type { NodeViewModel } from '../types';

/** Match controls / minimap floating chrome shadow. */
const SEARCH_BUTTON_SHADOW = 'm' as const;

/**
 * - `split`: top KQL toggle + bottom in-graph search
 * - `unified`: top KQL toggle only (in-graph search hidden for now)
 */
export type SearchControlsVariant = 'split' | 'unified';

const toggleSearchBarTourTitle = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.toggleSearchBar.tour.title',
  {
    defaultMessage: 'Refine your view with search',
  }
);

const toggleSearchBarTourContent = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.toggleSearchBar.tour.content',
  {
    defaultMessage:
      'Click here to reveal the search bar and advanced filtering options to focus on specific connections within the graph.',
  }
);

const toggleSearchBarTooltip = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.toggleSearchBar.tooltip',
  {
    defaultMessage: 'Toggle search bar',
  }
);

const investigateInTimelineTooltip = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.investigateInTimeline.tooltip',
  {
    defaultMessage: 'Investigate in Timeline',
  }
);

export interface ActionsProps extends CommonProps {
  /**
   * Whether to show toggle search action button. Defaults value is false.
   */
  showToggleSearch?: boolean;

  /**
   * Callback when search toggle button is clicked.
   */
  onSearchToggle?: (isSearchToggled: boolean) => void;

  /**
   * Number of search filters applied, used to show badge on search toggle button.
   */
  searchFilterCounter?: number;

  /**
   * Whether to show investigate in timeline action button. Defaults value is false.
   */
  showInvestigateInTimeline?: boolean;

  /**
   * Callback when investigate in timeline action button is clicked, ignored if investigateInTimelineComponent is provided.
   */
  onInvestigateInTimeline?: () => void;

  /**
   * Whether search is toggled or not. Defaults value is false.
   */
  searchToggled?: boolean;

  /**
   * Warning message to show. Defaults value is undefined.
   */
  searchWarningMessage?: { title: string; content: string };

  /**
   * Search controls layout. `unified` hides bottom in-graph search; both use a direct KQL toggle.
   */
  searchControlsVariant?: SearchControlsVariant;

  /**
   * Graph nodes (kept for API compatibility; in-graph search is temporarily hidden).
   */
  nodes?: NodeViewModel[];
}

// eslint-disable-next-line complexity
export const Actions = ({
  showToggleSearch = true,
  showInvestigateInTimeline = true,
  onInvestigateInTimeline,
  onSearchToggle,
  searchFilterCounter = 0,
  searchToggled,
  searchWarningMessage,
  searchControlsVariant = 'unified',
  nodes: _nodes = [],
  ...props
}: ActionsProps) => {
  const { euiTheme } = useEuiTheme();
  const searchButtonShadow = useEuiShadow(SEARCH_BUTTON_SHADOW);
  const [isSearchBarTourOpen, setIsSearchBarTourOpen] = useState(false);
  const hasSearchWarning = searchWarningMessage !== undefined && searchWarningMessage !== null;
  const [shouldShowSearchBarButtonTour, setShouldShowSearchBarButtonTour] = useLocalStorage(
    SHOW_SEARCH_BAR_BUTTON_TOUR_STORAGE_KEY,
    true
  );
  const { notifications } = useKibana().services;
  const isTourEnabled = notifications?.tours?.isEnabled() ?? true;
  const isUnified = searchControlsVariant === 'unified';
  const { registerSearchPanelToggle, registerFocusSearchInput } = useGraphInteractionTool();

  const openKqlSearch = useCallback(() => {
    onSearchToggle?.(true);
  }, [onSearchToggle]);

  const toggleKqlSearch = useCallback(() => {
    onSearchToggle?.(!searchToggled);
  }, [onSearchToggle, searchToggled]);

  // When bottom in-graph search is hidden (unified), wire shortcuts to the KQL bar.
  useEffect(() => {
    if (!isUnified) {
      return;
    }

    registerSearchPanelToggle(toggleKqlSearch);
    registerFocusSearchInput(openKqlSearch);

    return () => {
      registerSearchPanelToggle(null);
      registerFocusSearchInput(null);
    };
  }, [
    isUnified,
    openKqlSearch,
    registerFocusSearchInput,
    registerSearchPanelToggle,
    toggleKqlSearch,
  ]);

  if (shouldShowSearchBarButtonTour && isTourEnabled) {
    if (searchFilterCounter > 0) {
      setIsSearchBarTourOpen(true);
      setShouldShowSearchBarButtonTour(false);
    } else if (searchToggled) {
      // User already used the search bar, so we don't need to show the tour
      setShouldShowSearchBarButtonTour(false);
    }
  }

  const tooltipTitle =
    !isSearchBarTourOpen && hasSearchWarning ? searchWarningMessage.title : undefined;
  const tooltipContent =
    !isSearchBarTourOpen && hasSearchWarning
      ? searchWarningMessage.content
      : !isSearchBarTourOpen
      ? toggleSearchBarTooltip
      : undefined;

  const searchButtonCss = [
    css`
      position: relative;
      overflow: visible;
      width: 40px;
      min-width: 40px;
      border-radius: 4px;
      ${searchButtonShadow};
    `,
    !searchToggled
      ? css`
          border: ${euiTheme.border.thin};
          background-color: ${euiTheme.colors.backgroundBasePlain};
        `
      : undefined,
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="none" {...props}>
      {showToggleSearch && (
        <EuiFlexItem grow={false}>
          <EuiTourStep
            anchorPosition="leftUp"
            title={toggleSearchBarTourTitle}
            content={toggleSearchBarTourContent}
            isStepOpen={isSearchBarTourOpen}
            onFinish={() => setIsSearchBarTourOpen(false)}
            step={1}
            stepsTotal={1}
            maxWidth={350}
          >
            <EuiToolTip title={tooltipTitle} content={tooltipContent} position="left">
              <EuiButton
                iconType="magnify"
                color={searchToggled ? 'primary' : 'text'}
                fill={searchToggled}
                css={searchButtonCss}
                contentProps={{
                  css: css`
                    position: initial;
                  `,
                }}
                minWidth={false}
                size="m"
                aria-label={toggleSearchBarTooltip}
                data-test-subj={GRAPH_ACTIONS_TOGGLE_SEARCH_ID}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  onSearchToggle?.(!searchToggled);

                  setIsSearchBarTourOpen(false);

                  // After a button click we wish to remove the focus from the button so the tooltip won't appear
                  // Since it causes the position of the button to shift,
                  // the tooltip is hanging out there at the wrong position
                  // https://github.com/elastic/eui/issues/8266
                  event.currentTarget?.blur();
                }}
              >
                {hasSearchWarning && (
                  <EuiBeacon
                    css={css`
                      position: absolute;
                      left: ${-4.5 + (searchToggled ? 1 : 0)}px;
                      bottom: ${14 + (searchToggled ? 1 : 0)}px;
                      transition: all ${euiTheme.animation.fast} ease-in, right 0s linear,
                        bottom 0s linear !important;
                    `}
                    color="warning"
                  />
                )}
                {searchFilterCounter > 0 && (
                  <GraphNotificationBadge
                    css={css`
                      position: absolute;
                      right: ${-4.5 + (searchToggled ? 1 : 0)}px;
                      bottom: ${-4.5 + (searchToggled ? 1 : 0)}px;
                      transition: all ${euiTheme.animation.fast} ease-in, right 0s linear,
                        bottom 0s linear !important;
                    `}
                  >
                    {searchFilterCounter > 99 ? '99+' : searchFilterCounter}
                  </GraphNotificationBadge>
                )}
              </EuiButton>
            </EuiToolTip>
          </EuiTourStep>
        </EuiFlexItem>
      )}
      {showToggleSearch && showInvestigateInTimeline && (
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>
      )}
      {showInvestigateInTimeline && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={investigateInTimelineTooltip}
            position="left"
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="timeline"
              display="base"
              size="m"
              aria-label={investigateInTimelineTooltip}
              data-test-subj={GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                onInvestigateInTimeline?.();

                // After a button click we wish to remove the focus from the button so the tooltip won't appear
                // Since it causes a modal to be opened, the tooltip is hanging out there on top of the modal
                event.currentTarget?.blur();
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
