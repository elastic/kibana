/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiCheckbox, EuiNotificationBadge } from '@elastic/eui';
import styled from 'styled-components';

import { UtilityBarAction } from '../../../../common/components/utility_bar';
import * as i18n from './translations';

const UtilityBarFlexGroup = styled(EuiFlexGroup)`
  min-width: 175px;
`;

const AdditionalFiltersItem = styled(EuiFlexItem)`
  padding: ${({ theme }) => theme.eui.euiSizeS};
`;

const BuildingBlockContainer = styled(AdditionalFiltersItem)`
  background: ${({ theme }) => theme.eui.euiColorHighlight};
`;

const CenterText = styled.span`
  text-align: center;
`;

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
  const UtilityBarAdditionalFiltersContent = useCallback(
    (closePopover: () => void) => (
      <UtilityBarFlexGroup direction="column" gutterSize="none">
        <BuildingBlockContainer>
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
        </BuildingBlockContainer>
        <AdditionalFiltersItem>
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
        </AdditionalFiltersItem>
      </UtilityBarFlexGroup>
    ),
    [
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
      <CenterText>
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
      </CenterText>
    </UtilityBarAction>
  );
};
