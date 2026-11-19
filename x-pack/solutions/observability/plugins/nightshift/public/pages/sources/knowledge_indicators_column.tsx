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
import { getFormattedError } from '../../common/errors';
import { getHttpErrorStatus } from '../../common/http_error';

const KI_COUNT_POLL_INTERVAL_MS = 10_000;

const getFetchErrorMessage = (error: Error): string => {
  if (getHttpErrorStatus(error) === 403) {
    return i18n.translate(
      'xpack.nightshift.sources.knowledgeIndicatorsColumn.readPermissionErrorTooltip',
      {
        defaultMessage: 'You do not have permission to read knowledge indicators for this source.',
      }
    );
  }

  return i18n.translate('xpack.nightshift.sources.knowledgeIndicatorsColumn.refreshErrorTooltip', {
    defaultMessage: 'Could not refresh the KI feature count: {message}',
    values: { message: getFormattedError(error).message },
  });
};

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
  const { features, error } = useStreamFeatures(sourceId, [streamOnboardingResult], {
    refetchInterval: KI_COUNT_POLL_INTERVAL_MS,
  });
  const errorMessage = error ? getFetchErrorMessage(error) : undefined;

  return (
    <EuiText
      size="s"
      className={css`
        text-align: center;
        font-family: 'Roboto Mono', monospace;
      `}
    >
      {!isAwaitingRun && features.length ? <EuiI18nNumber value={features.length} /> : '—'}
      {errorMessage && (
        <>
          {' '}
          <EuiIconTip
            type="warning"
            color="warning"
            content={errorMessage}
            aria-label={errorMessage}
            disableScreenReaderOutput
          />
        </>
      )}
    </EuiText>
  );
}
