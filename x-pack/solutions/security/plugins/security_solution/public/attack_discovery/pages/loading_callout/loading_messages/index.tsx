/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';

import React, { useMemo } from 'react';

import { getAttackDiscoveryLoadingMessage } from '@kbn/elastic-assistant-common';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { useDateFormat } from '../../../../common/lib/kibana';
import { getCanceledResultMessage } from './get_canceled_result_message';
import { getFormattedDate } from './get_formatted_time';
import { getIsTerminalState } from '../get_is_terminal_state';
import { getLoadingCalloutAlertsCount } from './get_loading_callout_alerts_count';
import { getSuccessResultMessage } from './get_success_result_message';
import * as i18n from '../translations';
import { getFailureResultMessage } from './get_failure_result_message';
import { FailureAccordion } from './failure_accordion';

const TEXT_COLOR = '#343741';

interface Props {
  alertsContextCount: number | null;
  connectorName?: string;
  discoveries?: number;
  end?: string | null;
  generationEndTime?: string;
  loadingMessage?: string;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  reason?: string;
  start?: string | null;
  status?: 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed';
}

const LoadingMessagesComponent: React.FC<Props> = ({
  alertsContextCount,
  connectorName,
  discoveries,
  end,
  generationEndTime,
  localStorageAttackDiscoveryMaxAlerts,
  loadingMessage,
  reason,
  start,
  status,
}) => {
  const isDarkMode = useKibanaIsDarkMode();
  const dateFormat = useDateFormat();

  const formattedStart = useMemo(
    () =>
      getFormattedDate({
        date: start,
        dateFormat,
      }),
    [start, dateFormat]
  );

  const formattedEnd = useMemo(
    () =>
      getFormattedDate({
        date: end,
        dateFormat,
      }),
    [end, dateFormat]
  );

  const alertsCount = getLoadingCalloutAlertsCount({
    alertsContextCount,
    defaultMaxAlerts: DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
    localStorageAttackDiscoveryMaxAlerts,
  });

  const isTerminalState = useMemo(() => getIsTerminalState(status), [status]);

  const progressMessage = useMemo(
    () =>
      connectorName != null
        ? i18n.ATTACK_DISCOVERY_GENERATION_IN_PROGRESS_VIA(connectorName)
        : i18n.ATTACK_DISCOVERY_GENERATION_IN_PROGRESS,
    [connectorName]
  );

  const resultMessage = useMemo(() => {
    if (status === 'succeeded') {
      return getSuccessResultMessage({
        alertsContextCount,
        connectorName,
        dateFormat,
        discoveries,
        generationEndTime,
      });
    }

    if (status === 'failed') {
      return getFailureResultMessage({
        connectorName,
        dateFormat,
        generationEndTime,
      });
    }

    if (status === 'canceled') {
      return getCanceledResultMessage({
        connectorName,
        dateFormat,
        generationEndTime,
      });
    }

    // return default:
    return (
      loadingMessage ??
      getAttackDiscoveryLoadingMessage({
        alertsCount,
        end: formattedEnd,
        start: formattedStart,
      })
    );
  }, [
    alertsContextCount,
    alertsCount,
    connectorName,
    dateFormat,
    discoveries,
    formattedEnd,
    formattedStart,
    generationEndTime,
    loadingMessage,
    status,
  ]);

  return (
    <EuiFlexGroup data-test-subj="loadingMessages" direction="column" gutterSize="none">
      {!isTerminalState && (
        <EuiFlexItem grow={false}>
          <EuiText
            color={isDarkMode ? 'subdued' : TEXT_COLOR}
            css={css`
              font-weight: 600;
            `}
            data-test-subj="attackDiscoveryGenerationInProgress"
            size="s"
          >
            {progressMessage}
          </EuiText>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiText
          color={isDarkMode ? 'subdued' : TEXT_COLOR}
          css={css`
            font-weight: 400;
          `}
          data-test-subj="aisCurrentlyAnalyzing"
          size="s"
        >
          {resultMessage}
        </EuiText>
      </EuiFlexItem>

      {status === 'failed' && reason != null && reason.length > 0 && (
        <>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <FailureAccordion failureReason={reason} />
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};

LoadingMessagesComponent.displayName = 'LoadingMessages';

export const LoadingMessages = React.memo(LoadingMessagesComponent);
