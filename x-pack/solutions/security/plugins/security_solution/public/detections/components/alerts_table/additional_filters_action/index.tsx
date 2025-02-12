/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { UtilityBarAction } from '../../../../common/components/utility_bar';
import * as i18n from './translations';

export const AdditionalFiltersAction = ({
  areEventsLoading,
  onShowBuildingBlockAlertsChanged,
  showBuildingBlockAlerts,
  onShowOnlyThreatIndicatorAlertsChanged,
  showOnlyThreatIndicatorAlerts,
}: {
  areEventsLoading: boolean;
  onShowBuildingBlockAlertsChanged: (showBuildingBlockAlerts: boolean) => void;
  showBuildingBlockAlerts: boolean;
  onShowOnlyThreatIndicatorAlertsChanged: (showOnlyThreatIndicatorAlerts: boolean) => void;
  showOnlyThreatIndicatorAlerts: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const UtilityBarAdditionalFiltersContent = useCallback(
    (closePopover: () => void) => (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        css={css`
          min-width: 175px;
        `}
      >
        <EuiFlexItem
          css={css`
            color: ${euiTheme.colors.highlight};
            padding: ${euiTheme.size.s};
          `}
        >
          <EuiCheckbox
            id="showBuildingBlockAlertsCheckbox"
            aria-label="showBuildingBlockAlerts"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              closePopover();
              onShowBuildingBlockAlertsChanged(e.target.checked);
            }}
            checked={showBuildingBlockAlerts}
            color="text"
            data-test-subj="showBuildingBlockAlertsCheckbox"
            label={i18n.ADDITIONAL_FILTERS_ACTIONS_SHOW_BUILDING_BLOCK}
          />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            padding: ${euiTheme.size.s};
          `}
        >
          <EuiCheckbox
            id="showOnlyThreatIndicatorAlertsCheckbox"
            aria-label="showOnlyThreatIndicatorAlerts"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              closePopover();
              onShowOnlyThreatIndicatorAlertsChanged(e.target.checked);
            }}
            checked={showOnlyThreatIndicatorAlerts}
            color="text"
            data-test-subj="showOnlyThreatIndicatorAlertsCheckbox"
            label={i18n.ADDITIONAL_FILTERS_ACTIONS_SHOW_ONLY_THREAT_INDICATOR_ALERTS}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [
      euiTheme.colors.highlight,
      euiTheme.size.s,
      onShowBuildingBlockAlertsChanged,
      onShowOnlyThreatIndicatorAlertsChanged,
      showBuildingBlockAlerts,
      showOnlyThreatIndicatorAlerts,
    ]
  );

  const additionalFilterCount =
    (showBuildingBlockAlerts ? 1 : 0) + (showOnlyThreatIndicatorAlerts ? 1 : 0);

  return (
    <UtilityBarAction
      dataTestSubj="additionalFilters"
      disabled={areEventsLoading}
      iconType="arrowDown"
      iconSide="right"
      ownFocus
      popoverContent={UtilityBarAdditionalFiltersContent}
    >
      <span
        css={css`
          text-align: center;
        `}
      >
        {i18n.ADDITIONAL_FILTERS_ACTIONS}
        {additionalFilterCount > 0 && (
          <>
            &nbsp;
            <EuiNotificationBadge
              data-test-subj="additionalFiltersCountBadge"
              color="subdued"
            >{`${additionalFilterCount}`}</EuiNotificationBadge>
          </>
        )}
      </span>
    </UtilityBarAction>
  );
};
