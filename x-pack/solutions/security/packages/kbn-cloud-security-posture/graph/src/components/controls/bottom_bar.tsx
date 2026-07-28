/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTourStep,
  useEuiShadow,
  useEuiTheme,
  type CommonProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApplyFiltersPopover } from './apply_filters_popover';
import type { GraphFiltersState } from './apply_filters_popover';
import { useGraphInteractionTool } from './graph_interaction_tool_context';
import {
  DISPLAY_SHORTCUT,
  formatToolShortcutAriaLabel,
  SEARCH_TOOL_SHORTCUT,
} from './graph_keyboard_shortcuts';
import { ToolShortcutTooltip } from './tool_shortcut_tooltip';
import { GraphControlTooltip } from './graph_control_tooltip';
import { GraphKeyboardShortcutsPanel } from './graph_keyboard_shortcuts_panel';
import { GraphSearchPanel } from './graph_search_panel';
import { focusGraphFindInPageInput } from './graph_find_in_page';
import type { NodeViewModel } from '../types';
import { hasActiveEntityFilters } from './graph_entity_filters';
import { useGraphSearchContext } from './graph_search_context';
import { GraphNotificationBadge } from '../graph_notification_badge';
import { isOriginEntityOrEventNode } from '../graph/graph_origin_utils';
import { DISPLAY_STARTING_POINT_TOUR_STORAGE_KEY } from '../../common/constants';
import {
  GRAPH_BOTTOM_BAR_APPLY_FILTERS_ID,
  GRAPH_BOTTOM_BAR_KEYBOARD_SHORTCUTS_ID,
  GRAPH_BOTTOM_BAR_SEARCH_ID,
} from '../test_ids';

const investigateInTimelineLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.bottomBar.investigateInTimeline',
  { defaultMessage: 'Investigate in Timeline' }
);

const keyboardShortcutsLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.bottomBar.keyboardShortcuts',
  { defaultMessage: 'Keyboard shortcuts' }
);

const displayLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.bottomBar.display',
  { defaultMessage: 'Display' }
);

const searchLabel = i18n.translate('securitySolutionPackages.csp.graph.controls.bottomBar.search', {
  defaultMessage: 'Search',
});

const searchAriaLabel = formatToolShortcutAriaLabel(searchLabel, SEARCH_TOOL_SHORTCUT);
const displayAriaLabel = formatToolShortcutAriaLabel(displayLabel, DISPLAY_SHORTCUT);

const displayStartingPointTourTitle = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.bottomBar.displayStartingPoint.tour.title',
  { defaultMessage: 'Your starting point is highlighted' }
);

const displayStartingPointTourContent = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.bottomBar.displayStartingPoint.tour.content',
  {
    defaultMessage:
      'The dashed outline shows the entity or event you opened this graph from. Change this anytime in Display.',
  }
);

const BOTTOM_BAR_HEIGHT = 48;
const BOTTOM_BAR_BUTTON_SIZE = 32;
const BOTTOM_BAR_BUTTON_RADIUS = 4;
const BOTTOM_BAR_SECTION_GAP = 8;
const SEARCH_DISPLAY_GAP = 4;
/** EUI medium drop shadow for the bottom bar panel. */
const BOTTOM_BAR_SHADOW = 'm' as const;

export interface BottomBarProps extends CommonProps {
  showInvestigateInTimeline?: boolean;
  onInvestigateInTimeline?: () => void;
  filtersState: GraphFiltersState;
  onFiltersChange: (next: GraphFiltersState) => void;
  nodes: NodeViewModel[];
  /** When false, hides the in-graph search control (Option B). Defaults to true. */
  showInGraphSearch?: boolean;
}

export const BottomBar = ({
  showInvestigateInTimeline = false,
  onInvestigateInTimeline,
  filtersState,
  onFiltersChange,
  nodes,
  showInGraphSearch = true,
  ...props
}: BottomBarProps) => {
  const { euiTheme } = useEuiTheme();
  const { entityFilters, setEntityFilters } = useGraphSearchContext();
  const { notifications } = useKibana().services;
  const barShadow = useEuiShadow(BOTTOM_BAR_SHADOW);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isDisplayTourOpen, setIsDisplayTourOpen] = useState(false);
  const [shouldShowDisplayTour, setShouldShowDisplayTour] = useLocalStorage(
    DISPLAY_STARTING_POINT_TOUR_STORAGE_KEY,
    true
  );
  const isTourEnabled = notifications?.tours?.isEnabled() ?? true;
  const { registerApplyFiltersToggle, registerSearchPanelToggle, registerFocusSearchInput } =
    useGraphInteractionTool();

  const toggleApplyFiltersPanel = useCallback(() => {
    setIsFiltersOpen((isOpen) => !isOpen);
  }, []);

  const toggleSearchPanel = useCallback(() => {
    setIsSearchOpen((isOpen) => {
      const next = !isOpen;
      if (next) {
        setIsKeyboardShortcutsOpen(false);
        setIsFiltersOpen(false);
      }
      return next;
    });
  }, []);

  const closeSearchPanel = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const focusSearchInput = useCallback(() => {
    setIsSearchOpen(true);
    setIsKeyboardShortcutsOpen(false);
    setIsFiltersOpen(false);
    requestAnimationFrame(() => {
      focusGraphFindInPageInput();
    });
  }, []);

  useEffect(() => {
    registerApplyFiltersToggle(toggleApplyFiltersPanel);

    return () => {
      registerApplyFiltersToggle(null);
    };
  }, [registerApplyFiltersToggle, toggleApplyFiltersPanel]);

  useEffect(() => {
    if (!showInGraphSearch) {
      return;
    }

    registerSearchPanelToggle(toggleSearchPanel);

    return () => {
      registerSearchPanelToggle(null);
    };
  }, [registerSearchPanelToggle, showInGraphSearch, toggleSearchPanel]);

  useEffect(() => {
    if (!showInGraphSearch) {
      return;
    }

    registerFocusSearchInput(focusSearchInput);

    return () => {
      registerFocusSearchInput(null);
    };
  }, [focusSearchInput, registerFocusSearchInput, showInGraphSearch]);

  const entityFilterCount = useMemo(() => {
    let count = 0;
    if (entityFilters.riskScoreMin !== null) {
      count += 1;
    }
    if (entityFilters.assetCriticality.length > 0) {
      count += 1;
    }
    if (entityFilters.newEntitiesWindow !== null) {
      count += 1;
    }
    return count;
  }, [entityFilters]);

  const hasOriginNodes = useMemo(() => nodes.some(isOriginEntityOrEventNode), [nodes]);

  const dismissDisplayTour = useCallback(() => {
    setIsDisplayTourOpen(false);
    setShouldShowDisplayTour(false);
  }, [setShouldShowDisplayTour]);

  useEffect(() => {
    if (shouldShowDisplayTour && isTourEnabled && hasOriginNodes) {
      setIsDisplayTourOpen(true);
    }
  }, [shouldShowDisplayTour, isTourEnabled, hasOriginNodes]);

  const barShellCss = css`
    height: ${BOTTOM_BAR_HEIGHT}px;
    padding: 0 ${BOTTOM_BAR_SECTION_GAP}px;
    border: ${euiTheme.border.thin};
    border-radius: 8px;
    background-color: ${euiTheme.colors.backgroundBasePlain};
    overflow: visible;
    ${barShadow};
  `;

  const barLayoutCss = css`
    align-items: center;
    height: 100%;
  `;

  const controlButtonBaseCss = css`
    && {
      width: ${BOTTOM_BAR_BUTTON_SIZE}px;
      height: ${BOTTOM_BAR_BUTTON_SIZE}px;
      min-width: ${BOTTOM_BAR_BUTTON_SIZE}px;
      border-radius: ${BOTTOM_BAR_BUTTON_RADIUS}px;
    }
  `;

  const controlButtonCss = css`
    ${controlButtonBaseCss}

    &&:hover:not(:disabled),
    &&:focus-visible:not(:disabled) {
      background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};
    }
  `;

  const verticalDividerCss = css`
    width: ${euiTheme.border.width.thin};
    height: ${BOTTOM_BAR_BUTTON_SIZE}px;
    min-height: ${BOTTOM_BAR_BUTTON_SIZE}px;
    max-height: ${BOTTOM_BAR_BUTTON_SIZE}px;
    align-self: center;
    background-color: ${euiTheme.border.color};
    margin: 0 ${BOTTOM_BAR_SECTION_GAP}px;
    flex-shrink: 0;
  `;

  const searchDisplayGroupCss = css`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: ${SEARCH_DISPLAY_GAP}px;
  `;

  const handleKeyboardShortcutsClick = () => {
    setIsKeyboardShortcutsOpen((isOpen) => {
      const next = !isOpen;
      if (next) {
        setIsSearchOpen(false);
        setIsFiltersOpen(false);
      }
      return next;
    });
  };

  return (
    <div css={barShellCss} {...props}>
      <EuiFlexGroup direction="row" gutterSize="none" alignItems="center" css={barLayoutCss}>
        <EuiFlexItem grow={false}>
          <GraphKeyboardShortcutsPanel
            isOpen={isKeyboardShortcutsOpen}
            onClose={() => setIsKeyboardShortcutsOpen(false)}
          >
            <GraphControlTooltip
              content={keyboardShortcutsLabel}
              position="top"
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="keyboard"
                aria-label={keyboardShortcutsLabel}
                size="m"
                color={isKeyboardShortcutsOpen ? 'primary' : 'text'}
                css={controlButtonCss}
                data-test-subj={GRAPH_BOTTOM_BAR_KEYBOARD_SHORTCUTS_ID}
                onClick={handleKeyboardShortcutsClick}
              />
            </GraphControlTooltip>
          </GraphKeyboardShortcutsPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div css={verticalDividerCss} aria-hidden={true} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div css={searchDisplayGroupCss}>
            {showInGraphSearch ? (
              <GraphSearchPanel
                isOpen={isSearchOpen}
                onClose={closeSearchPanel}
                nodes={nodes}
                entityFilters={entityFilters}
                onEntityFiltersChange={setEntityFilters}
              >
                <GraphControlTooltip
                  content={
                    <ToolShortcutTooltip label={searchLabel} shortcut={SEARCH_TOOL_SHORTCUT} />
                  }
                  position="top"
                  disableScreenReaderOutput
                >
                  <div
                    css={css`
                      position: relative;
                      display: inline-flex;
                    `}
                  >
                    <EuiButtonIcon
                      iconType="query"
                      aria-label={searchAriaLabel}
                      size="m"
                      color={
                        isSearchOpen || hasActiveEntityFilters(entityFilters) ? 'primary' : 'text'
                      }
                      css={controlButtonCss}
                      data-test-subj={GRAPH_BOTTOM_BAR_SEARCH_ID}
                      onClick={toggleSearchPanel}
                    />
                    {entityFilterCount > 0 && (
                      <GraphNotificationBadge
                        css={css`
                          position: absolute;
                          right: -4px;
                          bottom: -4px;
                          pointer-events: none;
                        `}
                      >
                        {entityFilterCount > 99 ? '99+' : entityFilterCount}
                      </GraphNotificationBadge>
                    )}
                  </div>
                </GraphControlTooltip>
              </GraphSearchPanel>
            ) : null}

            <EuiTourStep
              anchorPosition="upCenter"
              title={displayStartingPointTourTitle}
              content={displayStartingPointTourContent}
              isStepOpen={isDisplayTourOpen}
              onFinish={dismissDisplayTour}
              step={1}
              stepsTotal={1}
              maxWidth={350}
            >
              <ApplyFiltersPopover
                isOpen={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                filtersState={filtersState}
                onFiltersChange={onFiltersChange}
              >
                <GraphControlTooltip
                  content={<ToolShortcutTooltip label={displayLabel} shortcut={DISPLAY_SHORTCUT} />}
                  position="top"
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="layers"
                    aria-label={displayAriaLabel}
                    size="m"
                    color={isFiltersOpen ? 'primary' : 'text'}
                    css={controlButtonCss}
                    data-test-subj={GRAPH_BOTTOM_BAR_APPLY_FILTERS_ID}
                    onClick={() => {
                      toggleApplyFiltersPanel();
                      dismissDisplayTour();
                    }}
                  />
                </GraphControlTooltip>
              </ApplyFiltersPopover>
            </EuiTourStep>
          </div>
        </EuiFlexItem>

        {showInvestigateInTimeline && (
          <>
            <EuiFlexItem grow={false}>
              <div css={verticalDividerCss} aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <GraphControlTooltip
                content={investigateInTimelineLabel}
                position="top"
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="timeline"
                  aria-label={investigateInTimelineLabel}
                  size="m"
                  color="text"
                  css={controlButtonCss}
                  onClick={onInvestigateInTimeline}
                />
              </GraphControlTooltip>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </div>
  );
};
