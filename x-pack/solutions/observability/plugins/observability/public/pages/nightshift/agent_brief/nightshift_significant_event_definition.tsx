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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

import type { EventSeverity, SignificantEvent } from '../nightshift_critical_events';

/**
 * Attachment type identifier registered with the Agent Builder
 * attachments service. The Critical-state CTAs push one attachment of
 * this type per significant event into the new conversation.
 */
export const NIGHTSHIFT_SIGNIFICANT_EVENT_TYPE = 'nightshift.significantEvent' as const;

/**
 * Payload carried by a Nightshift Significant Event attachment. Mirrors
 * the `SignificantEvent` shape used by the Critical page so the same
 * fixtures can be re-used as attachments without transformation.
 */
export type NightshiftSignificantEventData = SignificantEvent;

export type NightshiftSignificantEventAttachment = Attachment<
  typeof NIGHTSHIFT_SIGNIFICANT_EVENT_TYPE,
  NightshiftSignificantEventData
>;

const SEVERITY_BADGE: Record<
  EventSeverity,
  { color: 'danger' | 'warning' | 'hollow'; label: string }
> = {
  critical: {
    color: 'danger',
    label: i18n.translate('xpack.observability.nightshift.significantEvent.severity.critical', {
      defaultMessage: 'Critical',
    }),
  },
  medium: {
    color: 'warning',
    label: i18n.translate('xpack.observability.nightshift.significantEvent.severity.medium', {
      defaultMessage: 'Medium',
    }),
  },
  low: {
    color: 'hollow',
    label: i18n.translate('xpack.observability.nightshift.significantEvent.severity.low', {
      defaultMessage: 'Low',
    }),
  },
};

/**
 * Map severity → tile background / icon colour pair. Mirrors the
 * Critical page's `RiskStat` palette so the inline attachment tile
 * stays visually consistent with the in-page severity badges.
 */
const getSeverityColors = (severity: EventSeverity, theme: EuiThemeComputed) => {
  switch (severity) {
    case 'critical':
      return {
        background: theme.colors.backgroundBaseDanger,
        iconColor: theme.colors.textDanger,
      };
    case 'medium':
      return {
        background: theme.colors.backgroundBaseWarning,
        iconColor: theme.colors.textWarning,
      };
    case 'low':
    default:
      return {
        background: theme.colors.borderBaseSubdued,
        iconColor: theme.colors.textSubdued,
      };
  }
};

/**
 * One-line description rendered below the title in the attachment
 * header (both inline-in-conversation and in the canvas flyout). Pairs
 * the severity badge with a short label so the user can tell at a
 * glance how urgent the event is without expanding it.
 */
const SignificantEventDescription: React.FC<{ data: NightshiftSignificantEventData }> = ({
  data,
}) => {
  const severity = SEVERITY_BADGE[data.severity];
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color={severity.color}>{severity.label}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Canvas (right-side flyout) renderer.
 *
 * Intentionally minimal for the prototype — per the user request
 * "for now just all the panels to show they are there". The full event
 * detail UI (timeline, related entities, suggested remediations …)
 * lands in a follow-up.
 */
const CanvasContent: React.FC<{ data: NightshiftSignificantEventData }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const severityColors = getSeverityColors(data.severity, euiTheme);
  const severity = SEVERITY_BADGE[data.severity];

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="l"
      color="transparent"
      data-test-subj={`nightshiftSignificantEventCanvas-${data.id}`}
      css={css`
        background: ${euiTheme.colors.body};
        min-height: 100%;
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <div
                aria-hidden
                css={css`
                  width: 32px;
                  height: 32px;
                  border-radius: ${euiTheme.border.radius.small};
                  background: ${severityColors.background};
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                `}
              >
                <EuiIcon type="alert" size="m" color={severityColors.iconColor} />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h3>{data.title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={severity.color}>{severity.label}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem grow={false}>
          <EuiPanel hasShadow={false} hasBorder paddingSize="m" color="subdued">
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.observability.nightshift.significantEvent.canvas.placeholder', {
                  defaultMessage:
                    'Event details — including the timeline, affected entities, and suggested remediations — will land here in a follow-up.',
                })}
              </p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

/**
 * Build the Agent Builder attachment UI definition for the Nightshift
 * Significant Event type. Registered from the observability plugin's
 * `start` lifecycle against
 * `pluginsStart.agentBuilder.attachments.addAttachmentType(...)`.
 */
export const createNightshiftSignificantEventDefinition = (): AttachmentUIDefinition<
  NightshiftSignificantEventAttachment
> => ({
  getLabel: (attachment) => attachment.data.title,
  /*
   * Severity is rendered as a description right under the title in the
   * header. `renderInlineContent` is intentionally omitted so the
   * attachment presents as a single compact header-only card — title +
   * severity badge + Preview action. The full event detail UI lives in
   * the canvas (Preview).
   */
  getDescription: (attachment) => <SignificantEventDescription data={attachment.data} />,
  getIcon: () => 'sun',
  canvasWidth: '40vw',

  /*
   * Auto-render every staged significant event under each agent
   * response so the Critical / Morning conversation always shows
   * the events the user handed off, not only above the prompt. The
   * framework picks these up in
   * `round_layout.tsx` (`responseAttachments` memo) — see the
   * `showInResponse` flag on `AttachmentUIDefinition`.
   */
  showInResponse: true,

  renderCanvasContent: ({ attachment }) => <CanvasContent data={attachment.data} />,

  getActionButtons: ({ isCanvas, openCanvas }) => {
    if (isCanvas) return [];
    return [
      {
        label: i18n.translate('xpack.observability.nightshift.significantEvent.preview', {
          defaultMessage: 'Preview',
        }),
        icon: 'expand',
        type: ActionButtonType.SECONDARY,
        handler: () => openCanvas?.(),
      },
    ];
  },
});
