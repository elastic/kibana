/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  type CommonProps,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiToolTip,
  useEuiTheme,
  EuiNotificationBadge,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID,
  GRAPH_ACTIONS_TOGGLE_SEARCH_ID,
} from '../test_ids';

const toggleSearchBarTooltip = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.toggleSearchBar',
  {
    defaultMessage: 'Toggle search bar',
  }
);

const investigateInTimelineTooltip = i18n.translate(
  'securitySolutionPackages.csp.graph.controls.investigate',
  {
    defaultMessage: 'Investigate in timeline',
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
}

export const Actions = ({
  showToggleSearch = true,
  showInvestigateInTimeline = true,
  onInvestigateInTimeline,
  onSearchToggle,
  searchFilterCounter = 0,
  ...props
}: ActionsProps) => {
  const { euiTheme } = useEuiTheme();
  const [searchToggled, setSearchToggled] = useState<boolean>(false);

  return (
    <EuiFlexGroup direction="column" gutterSize={'none'} {...props}>
      {showToggleSearch && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={toggleSearchBarTooltip} position="left">
            <EuiButton
              iconType="search"
              color={searchToggled ? 'primary' : 'text'}
              fill={searchToggled}
              css={[
                css`
                  position: relative;
                  width: 40px;
                `,
                !searchToggled
                  ? css`
                      border: ${euiTheme.border.thin};
                      background-color: ${euiTheme.colors.backgroundBasePlain};
                    `
                  : undefined,
              ]}
              minWidth={false}
              size="m"
              aria-label={toggleSearchBarTooltip}
              data-test-subj={GRAPH_ACTIONS_TOGGLE_SEARCH_ID}
              onClick={() => {
                setSearchToggled((prev) => {
                  onSearchToggle?.(!prev);
                  return !prev;
                });
              }}
            >
              {searchFilterCounter > 0 && (
                <EuiNotificationBadge
                  css={css`
                    position: absolute;
                    right: ${-4.5 + (searchToggled ? 1 : 0)}px;
                    bottom: ${-4.5 + (searchToggled ? 1 : 0)}px;
                    transition: all ${euiTheme.animation.fast} ease-in, right 0s linear,
                      bottom 0s linear !important;
                  `}
                >
                  {searchFilterCounter > 9 ? '9+' : searchFilterCounter}
                </EuiNotificationBadge>
              )}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {showToggleSearch && showInvestigateInTimeline && <EuiHorizontalRule margin="xs" />}
      {showInvestigateInTimeline && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={investigateInTimelineTooltip} position="left">
            <EuiButtonIcon
              iconType="timeline"
              display="base"
              size="m"
              aria-label={investigateInTimelineTooltip}
              data-test-subj={GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID}
              onClick={() => {
                onInvestigateInTimeline?.();
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
