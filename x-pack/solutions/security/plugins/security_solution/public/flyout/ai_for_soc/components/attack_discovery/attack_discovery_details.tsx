/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import React, { memo } from 'react';
import { MiniAttackChain } from '../../../../attack_discovery/pages/results/attack_discovery_panel/panel_header/summary_actions/mini_attack_chain';
import * as i18n from './translations';

interface Props {
  attackDiscovery: AttackDiscovery;
}

export const AttackDiscoveryDetails = memo(({ attackDiscovery }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" data-test-subj="actions" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
            margin-right: ${euiTheme.size.s};
          `}
          data-test-subj="alertsLabel"
          size="xs"
        >
          {i18n.ALERTS}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiBadge color="danger" data-test-subj="alertsBadge">
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
          data-test-subj="attackChainLabel"
          size="xs"
        >
          {i18n.ATTACK_CHAIN}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <MiniAttackChain attackDiscovery={attackDiscovery} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

AttackDiscoveryDetails.displayName = 'AttackDiscoveryDetails';
