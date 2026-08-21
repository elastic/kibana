/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { SeverityTimelinePayload } from '../../../../common/threat_intelligence/hub';

const SEVERITY_COLOR: Record<
  SeverityTimelinePayload['points'][number]['severity'],
  'success' | 'warning' | 'danger' | 'default'
> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

type TimelineAttachment = Attachment<'threat-intel-severity-timeline', SeverityTimelinePayload>;

export const severityTimelineUiDefinition: AttachmentUIDefinition<TimelineAttachment> = {
  getLabel: (attachment) =>
    attachment.data?.attachmentLabel ??
    i18n.translate('xpack.securitySolution.threatIntelligence.attachments.severityTimeline.label', {
      defaultMessage: 'Severity timeline',
    }),
  getIcon: () => 'visAreaStacked',
  renderInlineContent: ({ attachment }) => {
    const { points, time_range_label: range } = attachment.data;
    const counts = points.reduce<Record<string, number>>((acc, p) => {
      acc[p.severity] = (acc[p.severity] ?? 0) + 1;
      return acc;
    }, {});

    return (
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h4>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.attachments.severityTimeline.title',
              {
                defaultMessage: 'Report severity over time',
              }
            )}
          </h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.severityTimeline.summary',
            {
              defaultMessage: '{range} · {count} {count, plural, one {report} other {reports}}',
              values: {
                range,
                count: points.length,
              },
            }
          )}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" wrap>
          {Object.entries(counts).map(([severity, count]) => (
            <EuiFlexItem grow={false} key={severity}>
              <EuiBadge
                color={SEVERITY_COLOR[severity as keyof typeof SEVERITY_COLOR] ?? 'default'}
              >
                {count} {severity}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        {/* The full scatter chart is intentionally deferred — the inline preview shows the
            count rollup. The canvas renderer (TODO) is where the EUI charts scatter lives. */}
      </EuiPanel>
    );
  },
};
