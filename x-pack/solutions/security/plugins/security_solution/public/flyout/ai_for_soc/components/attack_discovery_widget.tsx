/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import {
  EuiAccordion,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { AttackDiscoveryPanel } from './attack_discovery_panel';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';

export const ATTACK_DISCOVERY_NO_RESULTS_TEST_ID =
  'ai-for-soc-alert-flyout-attack-discovery-no-results';
export const ATTACK_DISCOVERY_ACCORDION_TEST_ID =
  'ai-for-soc-alert-flyout-attack-discovery-accordion';

const NO_RESULTS = i18n.translate('xpack.securitySolution.alertSummary.attackDiscovery.noResults', {
  defaultMessage: 'Not part of any attack discoveries',
});
const ADDITIONAL_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.alertSummary.attackDiscovery.additionalDiscoveries',
  {
    defaultMessage: 'View additional Attack discoveries for this alert',
  }
);

export interface AttackDiscoveryWidgetProps {
  /**
   * If of the alert part of an attack discovery
   */
  alertId: string;
}

/**
 * Component rendered in the attack discovery section of the AI for SOC alert flyout.
 * It renders the current state of the attack discovery the alert is part of.
 */
export const AttackDiscoveryWidget = memo(({ alertId }: AttackDiscoveryWidgetProps) => {
  const { assistantAvailability, http } = useAssistantContext();
  const { euiTheme } = useEuiTheme();
  const { to, from } = useGlobalTime();
  const { isLoading, data } = useFindAttackDiscoveries({
    alertIds: [alertId],
    http,
    start: from,
    end: to,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
  });

  const [attackDiscovery, setAttackDiscovery] = useState<AttackDiscoveryAlert | null>(null);
  const [additionalAttackDiscoveries, setAdditionalAttackDiscoveries] = useState<
    AttackDiscoveryAlert[]
  >([]);

  useEffect(() => {
    if (data != null && data.data.length > 0) {
      const [firstItem, ...rest] = data.data;
      setAttackDiscovery(firstItem);

      if (rest.length > 0) {
        setAdditionalAttackDiscoveries(rest);
      }
    }
  }, [data]);

  const attackDiscoveryAccordionId = useGeneratedHtmlId({
    prefix: 'attackDiscoveryAccordion',
  });

  return (
    <>
      {isLoading ? (
        <EuiLoadingSpinner />
      ) : attackDiscovery ? (
        <>
          <AttackDiscoveryPanel attackDiscovery={attackDiscovery} start={from} end={to} />
          {additionalAttackDiscoveries.length ? (
            <EuiAccordion
              data-test-subj={ATTACK_DISCOVERY_ACCORDION_TEST_ID}
              id={attackDiscoveryAccordionId}
              arrowDisplay="right"
              buttonContent={ADDITIONAL_DISCOVERIES}
            >
              {additionalAttackDiscoveries.map((ad, i) => (
                <AttackDiscoveryPanel key={i} attackDiscovery={ad} start={from} end={to} />
              ))}
            </EuiAccordion>
          ) : null}
        </>
      ) : (
        <EuiPanel
          css={css`
            margin: ${euiTheme.size.s} 0;
          `}
          paddingSize="m"
          hasBorder
        >
          <EuiPanel color="subdued" hasBorder={true}>
            <EuiText size="s" data-test-subj={ATTACK_DISCOVERY_NO_RESULTS_TEST_ID}>
              <p>{NO_RESULTS}</p>
            </EuiText>
          </EuiPanel>
        </EuiPanel>
      )}
    </>
  );
});

AttackDiscoveryWidget.displayName = 'AttackDiscoveryWidget';
