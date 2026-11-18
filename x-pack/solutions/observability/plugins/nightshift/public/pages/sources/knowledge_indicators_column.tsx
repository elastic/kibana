/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiI18nNumber, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import type { SignificantEventsWorkflowStatusResult } from '@kbn/significant-events-schema';
import React from 'react';
import { useStreamFeatures } from '../../data/knowledge_indicators/use_stream_features';

const KI_COUNT_POLL_INTERVAL_MS = 10_000;

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
  const { features } = useStreamFeatures(sourceId, [streamOnboardingResult], {
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
      {!isAwaitingRun && features.length ? <EuiI18nNumber value={features.length} /> : '—'}
    </EuiText>
  );
}
