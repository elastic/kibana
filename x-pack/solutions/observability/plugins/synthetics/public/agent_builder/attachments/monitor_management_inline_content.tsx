/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConfigKey } from '../../../common/runtime_types';
import type { MonitorAttachmentData } from '../../../common/agent_builder';
import {
  MonitorChipRow,
  MonitorStatusDot,
  getStatusAccentColor,
  getStatusBackgroundColor,
  getStatusCaption,
  inferMonitorStatus,
} from './monitor_management_status';

export interface MonitorManagementInlineContentProps {
  data: MonitorAttachmentData;
}

/**
 * Inline card body for the `MONITOR_MANAGEMENT_ATTACHMENT_TYPE` attachment.
 *
 * This is the compact card the agent_builder framework renders inside
 * the chat message body. Visual conventions are kept deliberately
 * close to the canvas tile (`MonitorManagementCanvasContent`) so that
 * the inline preview and the canvas preview read as the same object:
 *
 * - Status accent strip on the left (`getStatusAccentColor`).
 * - Status-tinted background (`getStatusBackgroundColor`).
 * - Status dot + monitor name as a compact header.
 * - Optional URL on a single subtitle line.
 * - `MonitorChipRow` (type / schedule / locations / tags / paused) as
 *   the body — the *same* component the canvas uses, so the two stay
 *   in lockstep when fields are added or renamed.
 *
 * Heading: we render the monitor name ourselves rather than relying
 * on the framework's attachment label slot, because the framework
 * label uses `getLabel()` which falls back to "New Synthetics monitor"
 * for unnamed drafts — fine in the menu, but reads oddly on the
 * inline card. Showing the actual draft name directly is clearer.
 *
 * Tree-shake hygiene: imports only `@elastic/eui`, `@emotion/react`,
 * `@kbn/i18n`, types from `common/`, and the shared
 * `monitor_management_status` helpers in this folder. Stays out of
 * `apps/synthetics/components/` to keep the inline chunk small.
 */
export const MonitorManagementInlineContent: React.FC<MonitorManagementInlineContentProps> = ({
  data,
}) => {
  const { euiTheme } = useEuiTheme();
  const status = inferMonitorStatus(data);
  const accentColor = getStatusAccentColor(status, euiTheme);
  const tileBg = getStatusBackgroundColor(status, euiTheme);
  const monitorName = data[ConfigKey.NAME];
  const url = data[ConfigKey.URLS];
  const caption = getStatusCaption(status);
  const placeholderName = i18n.translate(
    'xpack.synthetics.agentBuilder.monitor.canvas.placeholderName',
    { defaultMessage: 'Untitled monitor' }
  );

  return (
    <div
      data-test-subj="syntheticsMonitorAttachmentInline"
      data-test-status={status}
      css={css`
        border-left: ${euiTheme.border.width.thick} solid ${accentColor};
        background-color: ${tileBg};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <MonitorStatusDot status={status} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4 data-test-subj="syntheticsMonitorAttachmentInlineTitle">
              {monitorName && monitorName.length > 0 ? monitorName : placeholderName}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiText
        size="xs"
        color="subdued"
        data-test-subj="syntheticsMonitorAttachmentInlineSubtitle"
        css={css`
          margin-top: ${euiTheme.size.xs};
        `}
      >
        {url ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="link" size="s" color="subdued" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}
            >
              <span data-test-subj="syntheticsMonitorAttachmentInlineUrl">{url}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <span>{caption}</span>
        )}
      </EuiText>

      <div
        css={css`
          margin-top: ${euiTheme.size.s};
        `}
      >
        <MonitorChipRow data={data} />
      </div>
    </div>
  );
};
