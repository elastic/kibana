/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import type { AgentInvocation, AgentOperationOutcome, AgentToolCall } from './types';

const PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.agents';

export const AgentTimestamp: React.FC<{ value?: string }> = ({ value }) =>
  value && Number.isFinite(Date.parse(value)) ? (
    <PreferenceFormattedDate value={new Date(value)} />
  ) : (
    <>{i18n.translate(`${PREFIX}.notObserved`, { defaultMessage: 'Not observed' })}</>
  );

export const AgentOutcome: React.FC<{ outcome: AgentOperationOutcome }> = ({ outcome }) => (
  <EuiBadge color={outcome === 'failure' ? 'danger' : 'hollow'}>
    {outcome === 'failure'
      ? i18n.translate(`${PREFIX}.outcome.failure`, { defaultMessage: 'Failed' })
      : outcome === 'success'
      ? i18n.translate(`${PREFIX}.outcome.success`, { defaultMessage: 'Completed' })
      : i18n.translate(`${PREFIX}.outcome.unknown`, { defaultMessage: 'Outcome not recorded' })}
  </EuiBadge>
);

export const AgentEvidenceButton: React.FC<{ event: AgentInvocation | AgentToolCall }> = ({
  event,
}) => {
  const [open, setOpen] = useState(false);
  const { share } = useKibana().services;
  const titleId = useGeneratedHtmlId({ prefix: 'agentEvidence' });
  const locator = share?.url.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR');
  const timestamp = Date.parse(event.timestamp);
  const sourceUrl = Number.isFinite(timestamp)
    ? locator?.getRedirectUrl({
        dataViewSpec: { title: event.source.index, timeFieldName: '@timestamp' },
        query: {
          language: 'kuery',
          query: `trace_id: ${JSON.stringify(event.traceId)}`,
        },
        timeRange: {
          from: new Date(Date.parse(event.timestamp) - 86_400_000).toISOString(),
          to: new Date(Date.parse(event.timestamp) + 86_400_000).toISOString(),
        },
        columns: ['@timestamp', 'name', 'attributes.gen_ai.operation.name', 'span_id'],
      })
    : undefined;

  return (
    <>
      <EuiButtonEmpty size="xs" onClick={() => setOpen(true)} data-test-subj="agentInspectEvidence">
        {i18n.translate(`${PREFIX}.inspectEvidence`, { defaultMessage: 'Inspect evidence' })}
      </EuiButtonEmpty>
      {open && (
        <EuiModal onClose={() => setOpen(false)} aria-labelledby={titleId} maxWidth={640}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={titleId}>
              {i18n.translate(`${PREFIX}.evidenceTitle`, { defaultMessage: 'Execution evidence' })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiDescriptionList
              listItems={[
                {
                  title: i18n.translate(`${PREFIX}.time`, { defaultMessage: 'Observed at' }),
                  description: <AgentTimestamp value={event.timestamp} />,
                },
                {
                  title: i18n.translate(`${PREFIX}.traceId`, { defaultMessage: 'Trace ID' }),
                  description: event.traceId,
                },
                {
                  title: i18n.translate(`${PREFIX}.spanId`, { defaultMessage: 'Span ID' }),
                  description: event.spanId,
                },
                {
                  title: i18n.translate(`${PREFIX}.sourceIndex`, {
                    defaultMessage: 'Source index',
                  }),
                  description: event.source.index,
                },
                {
                  title: i18n.translate(`${PREFIX}.documentId`, { defaultMessage: 'Document ID' }),
                  description: event.source.id,
                },
              ]}
            />
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate(`${PREFIX}.evidenceMeaning`, {
                  defaultMessage:
                    'This record establishes an observed execution. Downstream access and delegation require their own authorization evidence.',
                })}
              </p>
            </EuiText>
          </EuiModalBody>
          <EuiModalFooter>
            {sourceUrl && (
              <EuiButtonEmpty href={sourceUrl} target="_blank" iconType="external">
                {i18n.translate(`${PREFIX}.openTrace`, {
                  defaultMessage: 'Open trace in Discover',
                })}
              </EuiButtonEmpty>
            )}
            <EuiButtonEmpty onClick={() => setOpen(false)}>
              {i18n.translate(`${PREFIX}.closeEvidence`, { defaultMessage: 'Close' })}
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
