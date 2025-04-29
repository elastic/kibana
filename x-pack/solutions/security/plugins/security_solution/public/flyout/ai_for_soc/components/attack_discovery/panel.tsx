/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import React, { memo, useCallback } from 'react';
import { EuiButtonEmpty, EuiPanel, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import { AttackDiscoveryDetails } from './attack_discovery_details';
import * as i18n from './translations';
import { useIdsFromUrl } from '../../../../attack_discovery/pages/results/history/use_ids_from_url';
import { useAttackDiscoveryHistoryTimerange } from '../../../../attack_discovery/pages/use_attack_discovery_history_timerange';

interface Props {
  attackDiscovery: AttackDiscoveryAlert;
  // timerange end
  end: string;
  // timerange start
  start: string;
}

export const AttackDiscoveryPanel = memo(({ attackDiscovery, end, start }: Props) => {
  const { navigateTo } = useNavigateTo();
  const { pathname } = useLocation();
  const { setIdsUrl } = useIdsFromUrl();
  const { euiTheme } = useEuiTheme();
  const { setHistoryEnd, setHistoryStart } = useAttackDiscoveryHistoryTimerange();
  const handleNavigateToAttackDiscovery = useCallback(
    (attackDiscoveryId: string) => {
      setHistoryStart(start);
      setHistoryEnd(end);
      if (pathname.includes('attack_discovery')) {
        setIdsUrl([attackDiscoveryId]);
      } else {
        navigateTo({
          path: `attack_discovery?id=${attackDiscoveryId}`,
        });
      }
    },
    [setHistoryStart, start, setHistoryEnd, end, pathname, setIdsUrl, navigateTo]
  );
  return (
    <EuiPanel
      css={css`
        margin: ${euiTheme.size.s} 0;
      `}
      paddingSize="m"
      hasBorder
    >
      <EuiText color="subdued" size="s">
        <p>{i18n.ALERT_PART}</p>
      </EuiText>
      <EuiTitle size="xs">
        <h3>{attackDiscovery.title}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <AttackDiscoveryDetails attackDiscovery={attackDiscovery} />
      <EuiButtonEmpty
        iconSide="right"
        iconType="popout"
        data-test-subj="attackDiscoveryViewDetails"
        onClick={() => handleNavigateToAttackDiscovery(attackDiscovery.id)}
        css={css`
          padding: 0;
        `}
      >
        {i18n.VIEW_DETAILS}
      </EuiButtonEmpty>
    </EuiPanel>
  );
});

AttackDiscoveryPanel.displayName = 'AttackDiscoveryPanel';
