/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import React, { memo, useCallback } from 'react';
import { EuiButtonEmpty, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import { i18n } from '@kbn/i18n';
import { AttackDiscoveryDetails } from './attack_discovery_details';
import { useIdsFromUrl } from '../../../attack_discovery/pages/results/history/use_ids_from_url';
import { useAttackDiscoveryHistoryTimerange } from '../../../attack_discovery/pages/use_attack_discovery_history_timerange';

export const ATTACK_DISCOVERY_VIEW_DETAILS_BUTTON_TEST_ID =
  'ai-for-soc-alert-flyout-attack-discovery-view-details-button';

const ALERT_PART = i18n.translate('xpack.securitySolution.alertSummary.attackDiscovery.alertPart', {
  defaultMessage: 'This alert is part of a',
});
const VIEW_DETAILS = i18n.translate(
  'xpack.securitySolution.alertSummary.attackDiscovery.viewDetails',
  {
    defaultMessage: 'View details in Attack Discovery',
  }
);

export interface AttackDiscoveryPanelProps {
  /**
   * Attack discovery object
   */
  attackDiscovery: AttackDiscoveryAlert;
  /**
   * Timerange end retrieved from the global KQL bar
   */
  end: string;
  /**
   * Timerange start  retrieved from the global KQL bar
   */
  start: string;
}

/**
 * Component rendered in the attack discovery section of the AI for SOC alert flyout.
 * It wraps all the details for the attack discovery for the visualized alert.
 */
export const AttackDiscoveryPanel = memo(
  ({ attackDiscovery, end, start }: AttackDiscoveryPanelProps) => {
    const { navigateTo } = useNavigateTo();
    const { pathname } = useLocation();
    const { setIdsUrl } = useIdsFromUrl();
    const { setHistoryEnd, setHistoryStart } = useAttackDiscoveryHistoryTimerange();

    const handleNavigateToAttackDiscovery = useCallback(() => {
      setHistoryStart(start);
      setHistoryEnd(end);
      if (pathname.includes('attack_discovery')) {
        setIdsUrl([attackDiscovery.id]);
      } else {
        navigateTo({
          path: `attack_discovery?id=${attackDiscovery.id}`,
        });
      }
    }, [
      attackDiscovery.id,
      setHistoryStart,
      start,
      setHistoryEnd,
      end,
      pathname,
      setIdsUrl,
      navigateTo,
    ]);

    return (
      <>
        {/* EuiSpacer used instead of css due to rendering issues with EuiAccordion */}
        <EuiSpacer size="s" />
        <EuiPanel paddingSize="m" hasBorder>
          <EuiText color="subdued" size="s">
            <p>{ALERT_PART}</p>
          </EuiText>
          <EuiTitle size="xs">
            <h3>{attackDiscovery.title}</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <AttackDiscoveryDetails attackDiscovery={attackDiscovery} />
          <EuiButtonEmpty
            iconSide="right"
            iconType="popout"
            data-test-subj={ATTACK_DISCOVERY_VIEW_DETAILS_BUTTON_TEST_ID}
            onClick={handleNavigateToAttackDiscovery}
            css={css`
              padding: 0;
            `}
          >
            {VIEW_DETAILS}
          </EuiButtonEmpty>
        </EuiPanel>
        <EuiSpacer size="s" />
      </>
    );
  }
);

AttackDiscoveryPanel.displayName = 'AttackDiscoveryPanel';
