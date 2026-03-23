/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi, useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { useAttackDetailsContext } from '../../context';
import { AttackDetailsLeftPanelKey } from '../../constants/panel_keys';
import {
  INSIGHTS_TAB_ID,
  ENTITIES_TAB_ID,
  CORRELATION_TAB_ID,
} from '../../constants/left_panel_paths';
import { AttackEntitiesDetails } from '../components/attack_entities_details';
import { AttackRelatedAlertsDetails } from '../components/attack_related_alerts_details';

const insightsSubTabButtons: EuiButtonGroupOptionProps[] = [
  {
    id: ENTITIES_TAB_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.attackDetails.left.insights.entitiesButtonLabel"
        defaultMessage="Entities"
      />
    ),
    'data-test-subj': 'attack-details-left-insights-entities-button',
  },
  {
    id: CORRELATION_TAB_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.attackDetails.left.insights.correlationsButtonLabel"
        defaultMessage="Correlation"
      />
    ),
    'data-test-subj': 'attack-details-left-insights-correlation-button',
  },
];

/**
 * Insights tab content for the Attack Details flyout left panel.
 * Shows Entities sub-view (related users and hosts from attack alerts).
 */
export const InsightsTab = memo(() => {
  const { attackId, indexName } = useAttackDetailsContext();
  const { openLeftPanel } = useExpandableFlyoutApi();
  const panels = useExpandableFlyoutState();
  const activeSubTabId = panels.left?.path?.subTab ?? ENTITIES_TAB_ID;

  const onChangeSubTab = useCallback(
    (optionId: string) => {
      openLeftPanel({
        id: AttackDetailsLeftPanelKey,
        params: { attackId, indexName },
        path: { tab: INSIGHTS_TAB_ID, subTab: optionId },
      });
    },
    [openLeftPanel, attackId, indexName]
  );

  return (
    <>
      <EuiButtonGroup
        color="primary"
        legend={i18n.translate(
          'xpack.securitySolution.flyout.attackDetails.left.insights.buttonGroupLegend',
          { defaultMessage: 'Insights options' }
        )}
        options={insightsSubTabButtons}
        idSelected={activeSubTabId}
        onChange={onChangeSubTab}
        buttonSize="compressed"
        isFullWidth
        data-test-subj="attack-details-left-insights-button-group"
      />
      <EuiSpacer size="m" />
      {activeSubTabId === ENTITIES_TAB_ID && <AttackEntitiesDetails />}
      {activeSubTabId === CORRELATION_TAB_ID && <AttackRelatedAlertsDetails />}
    </>
  );
});

InsightsTab.displayName = 'InsightsTab';
