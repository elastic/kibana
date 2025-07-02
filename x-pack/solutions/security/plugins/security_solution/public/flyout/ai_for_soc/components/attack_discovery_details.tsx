/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import React, { memo } from 'react';
import { MiniAttackChain } from '../../../attack_discovery/pages/results/attack_discovery_panel/panel_header/summary_actions/mini_attack_chain';

export const ATTACK_DISCOVERY_DETAILS_CONTAINER_TEST_ID =
  'ai-for-soc-alert-flyout-attack-discovery-details-container';
export const ATTACK_DISCOVERY_DETAILS_ALERTS_TEST_ID =
  'ai-for-soc-alert-flyout-attack-discovery-details-alerts';
export const ATTACK_DISCOVERY_DETAILS_ALERTS_BADGE_TEST_ID =
  'ai-for-soc-alert-flyout-attack-discovery-details-alerts-badge';
export const ATTACK_DISCOVERY_DETAILS_ATTACK_CHAIN_TEST_ID =
  'ai-for-soc-alert-flyout-attack-discovery-details-attack-chain';

const ALERTS = i18n.translate('xpack.securitySolution.alertSummary.attackDiscovery.alerts', {
  defaultMessage: 'Alerts:',
});
const ATTACK_CHAIN = i18n.translate(
  'xpack.securitySolution.alertSummary.attackDiscovery.attackChainLabel',
  {
    defaultMessage: 'Attack chain:',
  }
);

export interface AttackDiscoveryDetailsProps {
  /**
   * Attack discovery object
   */
  attackDiscovery: AttackDiscovery;
}

/**
 * Component rendered in the attack discovery section of the AI for SOC alert flyout.
 * It displays all the details for an attack discovery found for the investigated alert.
 */
export const AttackDiscoveryDetails = memo(({ attackDiscovery }: AttackDiscoveryDetailsProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj={ATTACK_DISCOVERY_DETAILS_CONTAINER_TEST_ID}
      gutterSize="none"
    >
      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
            margin-right: ${euiTheme.size.s};
          `}
          data-test-subj={ATTACK_DISCOVERY_DETAILS_ALERTS_TEST_ID}
          size="xs"
        >
          {ALERTS}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiBadge color="danger" data-test-subj={ATTACK_DISCOVERY_DETAILS_ALERTS_BADGE_TEST_ID}>
          {attackDiscovery.alertIds.length}
        </EuiBadge>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            color: ${euiTheme.colors.lightShade};
            margin-left: ${euiTheme.size.m};
            margin-right: ${euiTheme.size.m};
          `}
          size="s"
        >
          {'|'}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
            margin-right: ${euiTheme.size.s};
          `}
          data-test-subj={ATTACK_DISCOVERY_DETAILS_ATTACK_CHAIN_TEST_ID}
          size="xs"
        >
          {ATTACK_CHAIN}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <MiniAttackChain attackDiscovery={attackDiscovery} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

AttackDiscoveryDetails.displayName = 'AttackDiscoveryDetails';
