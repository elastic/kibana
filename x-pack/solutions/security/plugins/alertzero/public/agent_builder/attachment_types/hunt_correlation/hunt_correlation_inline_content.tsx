/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiBasicTable, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { parseHuntCorrelationData } from './types';
import type { DiamondScore, HuntCorrelationAttachment } from './types';

export const HUNT_CORRELATION_ATTACHMENT_TEST_ID = 'alertzeroHuntCorrelationAttachment';
export const HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID = 'alertzeroHuntCorrelationAttachmentEmpty';

const cellStyles = css`
  overflow-wrap: anywhere;
`;

export const HuntCorrelationInlineContent: React.FC<
  AttachmentRenderProps<HuntCorrelationAttachment>
> = ({ attachment }) => {
  const parsed = parseHuntCorrelationData(attachment?.data);

  if (!parsed) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj={HUNT_CORRELATION_ATTACHMENT_EMPTY_TEST_ID}
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.empty', {
            defaultMessage: 'No hunt correlation data available',
          })}
        </EuiText>
      </EuiPanel>
    );
  }

  const anchorsByKind = new Map<string, string[]>();
  for (const anchor of parsed.anchors) {
    const values = anchorsByKind.get(anchor.kind) ?? [];
    values.push(anchor.value);
    anchorsByKind.set(anchor.kind, values);
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="m"
      data-test-subj={HUNT_CORRELATION_ATTACHMENT_TEST_ID}
    >
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchors', {
            defaultMessage: 'Anchors',
          })}
        </strong>
      </EuiText>
      {parsed.anchors.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.anchorsEmpty', {
            defaultMessage: 'No anchors recorded',
          })}
        </EuiText>
      ) : (
        [...anchorsByKind.entries()].map(([kind, values]) => (
          <div key={kind} css={{ marginBottom: 4 }}>
            <EuiText size="xs" color="subdued" css={cellStyles}>
              {kind}
            </EuiText>
            {values.map((value) => (
              <EuiBadge key={value} color="hollow" css={{ marginRight: 4 }}>
                {value}
              </EuiBadge>
            ))}
          </div>
        ))
      )}

      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScores',
            { defaultMessage: 'Diamond scores' }
          )}
        </strong>
      </EuiText>
      {parsed.diamondScores.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScoresEmpty',
            { defaultMessage: 'No diamond scores recorded' }
          )}
        </EuiText>
      ) : (
        <EuiBasicTable<DiamondScore>
          tableCaption={i18n.translate(
            'xpack.alertzero.agentBuilder.attachments.huntCorrelation.diamondScoresTableCaption',
            { defaultMessage: 'Diamond model correlation scores' }
          )}
          items={parsed.diamondScores}
          columns={[
            {
              field: 'vertex',
              name: i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.huntCorrelation.vertex',
                { defaultMessage: 'Vertex' }
              ),
            },
            {
              field: 'related_report_id',
              name: i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.huntCorrelation.relatedReport',
                { defaultMessage: 'Related report' }
              ),
              render: (relatedReportId: string) => <span css={cellStyles}>{relatedReportId}</span>,
            },
            {
              field: 'score',
              name: i18n.translate(
                'xpack.alertzero.agentBuilder.attachments.huntCorrelation.score',
                { defaultMessage: 'Score' }
              ),
            },
          ]}
        />
      )}

      {parsed.thresholds && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertzero.agentBuilder.attachments.huntCorrelation.thresholds', {
              defaultMessage:
                'Thresholds: anchor_match={anchorMatch}, diamond_vertex={diamondVertex}',
              values: {
                anchorMatch: parsed.thresholds.anchor_match,
                diamondVertex: parsed.thresholds.diamond_vertex,
              },
            })}
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};
