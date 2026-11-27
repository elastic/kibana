/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiI18nNumber, EuiIconTip, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { SignificantEventsWorkflowStatusResult } from '@kbn/significant-events-schema';
import React from 'react';
import { useStreamFeatures } from '../../data/knowledge_indicators/use_stream_features';

const KI_COUNT_POLL_INTERVAL_MS = 10_000;
const KI_COUNT_REFRESH_ERROR_TOOLTIP = i18n.translate(
  'xpack.nightshift.sources.knowledgeIndicatorsColumn.refreshErrorTooltip',
  { defaultMessage: 'Unable to refresh the KI feature count. Retrying automatically.' }
);

interface KnowledgeIndicatorsColumnProps {
  sourceId: string;
  streamOnboardingResult?: SignificantEventsWorkflowStatusResult;
  /** The count belongs to the previous query until the new run is reported. */
  isAwaitingRun: boolean;
}

export function KnowledgeIndicatorsColumn({
  sourceId,
  streamOnboardingResult,
  isAwaitingRun,
}: KnowledgeIndicatorsColumnProps) {
  const { features, hasError } = useStreamFeatures(sourceId, [streamOnboardingResult], {
    refetchInterval: KI_COUNT_POLL_INTERVAL_MS,
  });

  return (
    <EuiText
      size="s"
      className={css`
        text-align: center;
        font-family: 'Roboto Mono', monospace;
      `}
    >
      {hasError ? (
        <EuiIconTip
          type="warning"
          color="danger"
          content={KI_COUNT_REFRESH_ERROR_TOOLTIP}
          aria-label={KI_COUNT_REFRESH_ERROR_TOOLTIP}
          disableScreenReaderOutput
        />
      ) : !isAwaitingRun && features.length ? (
        <EuiI18nNumber value={features.length} />
      ) : (
        '—'
      )}
    </EuiText>
  );
}
