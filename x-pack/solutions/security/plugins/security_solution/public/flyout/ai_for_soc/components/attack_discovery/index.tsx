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
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { AttackDiscoveryPanel } from './panel';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import * as i18n from './translations';

interface Props {
  id: string;
}

export const AttackDiscoveryWidget = memo(({ id }: Props) => {
  const { assistantAvailability, http } = useAssistantContext();
  const { euiTheme } = useEuiTheme();
  const { to, from } = useGlobalTime();
  const { isLoading, data } = useFindAttackDiscoveries({
    alertIds: [id],
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
          {additionalAttackDiscoveries.length && (
            <EuiAccordion
              id={attackDiscoveryAccordionId}
              arrowDisplay="right"
              buttonContent={i18n.ADDITIONAL_DISCOVERIES}
            >
              {additionalAttackDiscoveries.map((ad, i) => (
                <AttackDiscoveryPanel key={i} attackDiscovery={ad} start={from} end={to} />
              ))}
            </EuiAccordion>
          )}
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
            <EuiText size="s" data-test-subj="no-results">
              <p>{i18n.NO_RESULTS}</p>
            </EuiText>
          </EuiPanel>
        </EuiPanel>
      )}
    </>
  );
});

AttackDiscoveryWidget.displayName = 'AttackDiscoveryWidget';
