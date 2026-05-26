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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { ShellSpinner } from '../shell_spinner';
import { i18n } from '@kbn/i18n';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { getNightshiftIconDataUrl } from '@kbn/spaces-plugin/common';

import { NightshiftLoading } from '../nightshift_loading';
import { NightshiftHealthy } from '../nightshift_healthy';
import { NightshiftCritical } from '../nightshift_critical';
import type { NightshiftStatus } from '../nightshift_state';

/**
 * Attachment type identifier registered with the Agent Builder
 * attachments service. Used as the discriminant for
 * `Attachment<'nightshift.agentBrief', NightshiftAgentBriefData>`.
 */
export const NIGHTSHIFT_AGENT_BRIEF_TYPE = 'nightshift.agentBrief' as const;

/**
 * Payload carried by a Nightshift Agent Brief attachment. The `mode`
 * decides which Nightshift panel renders inside the canvas — the brief
 * is essentially "the Nightshift screen the user was looking at when
 * they handed off to Agent Builder".
 */
export interface NightshiftAgentBriefData extends Record<string, unknown> {
  mode: NightshiftStatus;
}

export type NightshiftAgentBriefAttachment = Attachment<
  typeof NIGHTSHIFT_AGENT_BRIEF_TYPE,
  NightshiftAgentBriefData
>;

const BRIEF_LABEL = i18n.translate('xpack.observability.nightshift.agentBrief.label', {
  defaultMessage: 'Agent brief',
});

/**
 * Compact inline preview rendered inside the conversation round (under
 * the user message). Shows a one-line summary of what's in the brief
 * plus a hint that the full Nightshift view is available behind the
 * "Open brief" action button.
 *
 * Intentionally light — the real content lives in the canvas flyout via
 * `renderCanvasContent` below.
 */
const InlinePreview: React.FC<{ mode: NightshiftStatus }> = ({ mode }) => {
  const { euiTheme } = useEuiTheme();

  const headline = (() => {
    switch (mode) {
      case 'healthy':
        return i18n.translate('xpack.observability.nightshift.agentBrief.inline.healthy', {
          defaultMessage: 'System healthy — no critical events detected.',
        });
      case 'critical':
        return i18n.translate('xpack.observability.nightshift.agentBrief.inline.critical', {
          defaultMessage: 'Significant events require escalation.',
        });
      case 'loading':
      default:
        return i18n.translate('xpack.observability.nightshift.agentBrief.inline.loading', {
          defaultMessage: 'Nightshift workflows are still analysing your data.',
        });
    }
  })();

  return (
    <div
      data-test-subj={`nightshiftAgentBriefInline-${mode}`}
      css={css`
        padding: ${euiTheme.size.base};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          {/*
           * The leading glyph swaps with the mode:
           *   loading  → ShellSpinner (terminal-style braille loader,
           *              signals "still analysing")
           *   healthy  → static moon icon (Nightshift brand)
           *   critical → static moon icon (Nightshift brand)
           */}
          {mode === 'loading' ? (
            <ShellSpinner size={24} aria-label="Nightshift analysing" />
          ) : (
            <img
              src={getNightshiftIconDataUrl({ size: 24 })}
              alt=""
              width={24}
              height={24}
              aria-hidden
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{headline}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.observability.nightshift.agentBrief.inline.hint', {
              defaultMessage:
                'Open the brief to inspect the full Nightshift snapshot the agent is working from.',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

/**
 * Canvas (right-side flyout) renderer. Renders the same Nightshift
 * panel the user was looking at when they handed off — `loading`,
 * `healthy`, or `critical` — so the agent and the user share an
 * identical view of the system state.
 *
 * The panels are designed for a centered 753px column on the main
 * page, but they degrade cleanly into the canvas's narrower column
 * because the inner grids/panels use percent-based widths.
 */
const CanvasContent: React.FC<{ mode: NightshiftStatus }> = ({ mode }) => {
  const { euiTheme } = useEuiTheme();
  const Page = (() => {
    switch (mode) {
      case 'healthy':
        return NightshiftHealthy;
      case 'critical':
        return NightshiftCritical;
      case 'loading':
      default:
        return NightshiftLoading;
    }
  })();

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="l"
      color="transparent"
      data-test-subj={`nightshiftAgentBriefCanvas-${mode}`}
      css={css`
        background: ${euiTheme.colors.body};
        min-height: 100%;
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <img
                src={getNightshiftIconDataUrl({ size: 20 })}
                alt=""
                width={20}
                height={20}
                aria-hidden
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.observability.nightshift.agentBrief.canvas.title', {
                    defaultMessage: 'Nightshift agent brief',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconType="dot" iconSide="left">
                {mode}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow>
          {/*
           * Render the actual Nightshift panel for the given mode. The
           * panel's own internal max-width (753px) keeps the layout
           * stable inside the canvas column; on narrower canvases the
           * inner grids reflow naturally because they use `EuiFlexGrid`
           * + percentage widths.
           */}
          <Page />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

/**
 * Build the Agent Builder attachment UI definition for the Nightshift
 * "Agent brief" type. Registered from the observability plugin's
 * `start` lifecycle against
 * `pluginsStart.agentBuilder.attachments.addAttachmentType(...)`.
 */
export const createNightshiftAgentBriefDefinition = (): AttachmentUIDefinition<
  NightshiftAgentBriefAttachment
> => ({
  getLabel: () => BRIEF_LABEL,
  // Default avatar inside the attachment pill / canvas header. We re-use
  // the moon icon used everywhere else in the Nightshift surface.
  getIcon: () => getNightshiftIconDataUrl({ size: 16 }),

  // Make the canvas a touch wider than the EUI default so the
  // Nightshift Critical panel (753px content + side padding) renders
  // without a horizontal scrollbar.
  canvasWidth: '50vw',

  /*
   * Auto-render the brief as an inline widget below every agent
   * response in the conversation. The brief is ambient session
   * context (the Nightshift snapshot the user handed off) — keeping
   * it visible and interactive on every reply lets the user re-open
   * the canvas or skim the snapshot without scrolling back to the
   * first message.
   */
  showInResponse: true,

  renderInlineContent: ({ attachment }) => <InlinePreview mode={attachment.data.mode} />,
  renderCanvasContent: ({ attachment }) => <CanvasContent mode={attachment.data.mode} />,

  /*
   * "Open brief" action sits in the attachment header — clicking it
   * pops the right-side canvas flyout open. Matches the pattern used by
   * the alerting rule attachment ("Preview" → `openCanvas`).
   */
  getActionButtons: ({ isCanvas, openCanvas }) => {
    if (isCanvas) return [];
    return [
      {
        label: i18n.translate('xpack.observability.nightshift.agentBrief.openBrief', {
          defaultMessage: 'Open brief',
        }),
        icon: 'expand',
        type: ActionButtonType.SECONDARY,
        handler: () => openCanvas?.(),
      },
    ];
  },
});
