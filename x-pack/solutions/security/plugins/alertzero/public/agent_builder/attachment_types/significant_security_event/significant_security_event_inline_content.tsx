/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiDescriptionList,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { parseSignificantSecurityEventData } from './types';
import type { SignificantSecurityEventAttachment, TimelineEntry } from './types';

export const SSE_ATTACHMENT_TEST_ID = 'alertzeroSignificantSecurityEventAttachment';
export const SSE_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroSignificantSecurityEventAttachmentEmpty';

const cellStyles = css`
  overflow-wrap: anywhere;
`;

const SEVERITY_COLOR_MAP: Record<string, string> = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export const SignificantSecurityEventInlineContent: React.FC<
  AttachmentRenderProps<SignificantSecurityEventAttachment>
> = ({ attachment }) => {
  const parsed = parseSignificantSecurityEventData(attachment?.data);

  if (!parsed) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj={SSE_ATTACHMENT_EMPTY_TEST_ID}
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.empty', {
            defaultMessage: 'No significant security event data available',
          })}
        </EuiText>
      </EuiPanel>
    );
  }

  const listItems = [
    {
      title: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.status', {
        defaultMessage: 'Status',
      }),
      description: <span css={cellStyles}>{parsed.status ?? '—'}</span>,
    },
    {
      title: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.sourceWatch', {
        defaultMessage: 'Source watch',
      }),
      description: <span css={cellStyles}>{parsed.sourceWatch ?? '—'}</span>,
    },
    {
      title: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.capability', {
        defaultMessage: 'Capability',
      }),
      description: <span css={cellStyles}>{parsed.capability ?? '—'}</span>,
    },
  ];

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj={SSE_ATTACHMENT_TEST_ID}>
      <EuiText size="s">
        <strong css={cellStyles}>{parsed.title}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiBadge color={SEVERITY_COLOR_MAP[parsed.severity] ?? 'hollow'}>
        {parsed.confidence != null ? `${parsed.severity} (${parsed.confidence})` : parsed.severity}
      </EuiBadge>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" compressed listItems={listItems} />
      {parsed.hypothesisTested && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.hypothesis', {
                defaultMessage: 'Hypothesis tested',
              })}
            </strong>
            <p css={cellStyles}>{parsed.hypothesisTested}</p>
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timeline', {
            defaultMessage: 'Timeline',
          })}
        </strong>
      </EuiText>
      {parsed.timeline.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timelineEmpty', {
            defaultMessage: 'No timeline entries recorded',
          })}
        </EuiText>
      ) : (
        <EuiBasicTable<TimelineEntry>
          tableCaption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.sse.timelineTableCaption',
            { defaultMessage: 'Significant security event timeline' }
          )}
          items={parsed.timeline}
          columns={[
            {
              field: 'at',
              name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timelineAt', {
                defaultMessage: 'When',
              }),
              width: '20%',
            },
            {
              field: 'what',
              name: i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.timelineWhat', {
                defaultMessage: 'What',
              }),
              render: (what: string) => <span css={cellStyles}>{what}</span>,
            },
          ]}
        />
      )}
      <EuiSpacer size="s" />
      <EuiText size="s">
        {parsed.entities.length === 0 ? (
          <span css={cellStyles}>
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.entitiesEmpty', {
              defaultMessage: 'No entities recorded',
            })}
          </span>
        ) : (
          parsed.entities.map((entity) => (
            <EuiBadge key={entity} color="hollow" css={{ marginRight: 4, marginBottom: 4 }}>
              {entity}
            </EuiBadge>
          ))
        )}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.alertzero.agentBuilder.attachments.sse.evidenceCounts', {
          defaultMessage:
            'Evidence for: {forCount} · Evidence against: {againstCount} · Indicators: {indicatorCount}',
          values: {
            forCount: parsed.evidenceForCount,
            againstCount: parsed.evidenceAgainstCount,
            indicatorCount: parsed.indicators.length,
          },
        })}
      </EuiText>
    </EuiPanel>
  );
};
