/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { type ActionButton, ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
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
import {
  projectMonitorWithLastSaved,
  useMonitorCanvasActions,
  type MonitorCanvasSaveState,
} from './use_monitor_canvas_actions';

/**
 * Fixed height of the tile area, mirroring `METRIC_ITEM_HEIGHT` from
 * the Synthetics Overview tile. Keeps the visual rhyme exact.
 */
const METRIC_TILE_HEIGHT = 180;

export interface MonitorManagementCanvasContentProps {
  /** The current attachment payload. */
  data: MonitorAttachmentData;
  /** Browser HTTP client (forwarded to actions). */
  http: HttpStart;
  /** Application contract for capability lookup + navigation. */
  application: ApplicationStart;
  /**
   * Framework canvas callback — registers buttons in the flyout header.
   * We deliberately register an empty array to keep the header clean and
   * render Create/Update/View as proper `EuiButton`s in the body footer
   * instead. See `useMonitorCanvasActions` for the rationale.
   */
  registerActionButtons: (buttons: ActionButton[]) => void;
  /** Framework canvas callback — invoked after a clean Create. */
  updateOrigin: (origin: string) => Promise<unknown>;
  /** Framework canvas callback — closes the flyout. */
  closeCanvas: () => void;
}

interface ActionFooterProps {
  buttons: ActionButton[];
  isSaving: boolean;
}

/**
 * Renders the Create / Update / View buttons returned by
 * `useMonitorCanvasActions` as proper EUI buttons in the canvas body
 * footer. PRIMARY → `EuiButton fill`, SECONDARY → `EuiButtonEmpty`.
 *
 * `disabledReason` is wrapped in an `EuiToolTip` so we don't lose the
 * affordance the framework's `ActionButton` shape promises.
 */
const ActionFooter: React.FC<ActionFooterProps> = ({ buttons, isSaving }) => {
  if (buttons.length === 0) {
    return null;
  }
  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="flexEnd"
      responsive={false}
      data-test-subj="syntheticsMonitorAttachmentCanvasActions"
    >
      {buttons.map((button) => {
        const isPrimary = button.type === ActionButtonType.PRIMARY;
        const onClick = () => {
          void button.handler();
        };
        const button$ = isPrimary ? (
          <EuiButton
            fill
            color="primary"
            size="m"
            iconType={button.icon}
            isLoading={isSaving && button.icon === 'save'}
            disabled={Boolean(button.disabled)}
            onClick={onClick}
            data-test-subj={`syntheticsMonitorAttachmentCanvasAction-${button.icon}`}
          >
            {button.label}
          </EuiButton>
        ) : (
          <EuiButtonEmpty
            color="primary"
            size="m"
            iconType={button.icon}
            disabled={Boolean(button.disabled)}
            onClick={onClick}
            data-test-subj={`syntheticsMonitorAttachmentCanvasAction-${button.icon}`}
          >
            {button.label}
          </EuiButtonEmpty>
        );
        return (
          <EuiFlexItem grow={false} key={button.label}>
            {button.disabled && button.disabledReason ? (
              <EuiToolTip content={button.disabledReason}>
                <span>{button$}</span>
              </EuiToolTip>
            ) : (
              button$
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

/**
 * Canvas body for the `MONITOR_MANAGEMENT_ATTACHMENT_TYPE` attachment.
 *
 * Visual treatment is hand-built to mirror the Synthetics Overview
 * tile (`MetricItem`) without going through `@elastic/charts`'s
 * `<Metric>` component. We tried `<Chart><Metric/></Chart>` first
 * because it's how the Overview itself draws the tile, but Metric's
 * "no value, no trend" rendering branch falls back to a text-only
 * mode that drops the status-tinted card background and the
 * fixed-height layout — exactly the visual treatment we wanted to
 * inherit. Without heartbeat data (which we don't fetch in v1; see
 * F11 in `followups.md`), Metric has nothing to draw and gracefully
 * degrades into something that doesn't read as a tile at all. So we
 * rebuild the tile directly from EUI primitives:
 *
 * | Tile slot       | Implementation                                    |
 * | --------------- | ------------------------------------------------- |
 * | Card            | Fixed-height `EuiPanel`, status-tinted bg         |
 * | Status accent   | `MonitorStatusDot` (top-left)                     |
 * | Title           | `EuiTitle size="m"` (monitor name)                |
 * | Subtitle        | `EuiText size="s" color="subdued"` (caption + URL)|
 * | Chip row        | `MonitorChipRow` (type / schedule / locations…)   |
 * | Sparkline       | Deferred to F12 (heartbeat fetch).                |
 *
 * Below the tile we keep our own structure: optional callouts (CLI-
 * managed banner, save-error, location warnings) followed by the
 * action footer with Create / Update / View buttons.
 *
 * Tree-shake hygiene: imports `@elastic/eui`, `@emotion/react`,
 * `@kbn/i18n`, `@kbn/agent-builder-browser`, `@kbn/core/public`,
 * types from `common/`, and the shared
 * `monitor_management_status` / `use_monitor_canvas_actions` helpers
 * in this folder. **Do not** pull in monitor-form, anything from
 * `apps/synthetics/components/`, or `@elastic/charts`.
 */
export const MonitorManagementCanvasContent: React.FC<MonitorManagementCanvasContentProps> = ({
  data,
  http,
  application,
  registerActionButtons,
  updateOrigin,
  closeCanvas,
}) => {
  const { euiTheme } = useEuiTheme();

  const capabilities = application.capabilities;
  const canEdit = capabilities.uptime?.save === true;
  const canUseElasticManaged = (capabilities.uptime?.elasticManagedLocationsEnabled ??
    true) as boolean;

  const [saveState, setSaveState] = useState<MonitorCanvasSaveState>({
    isSaving: false,
    saveError: null,
    locationWarnings: [],
  });

  // After a successful Create the framework's `updateOrigin` writes
  // the new origin onto the attachment record but **does not refresh
  // the data snapshot** (see followup F14). Without this projection
  // the canvas would keep inferring `'proposed'` from the stale data
  // and the user would see **Create** even though Synthetics already
  // owns the monitor — a second click would round-trip to the
  // duplicate-name error. `projectMonitorWithLastSaved` overlays the
  // captured `config_id` only when the name + url still match the
  // saved monitor, so the override doesn't bleed across attachments.
  const effectiveData = useMemo(
    () => projectMonitorWithLastSaved(data, saveState.lastSaved),
    [data, saveState.lastSaved]
  );

  const status = inferMonitorStatus(effectiveData);
  const tileBg = getStatusBackgroundColor(status, euiTheme);
  const accentColor = getStatusAccentColor(status, euiTheme);

  const actionButtons = useMonitorCanvasActions({
    monitor: effectiveData,
    canEdit,
    canUseElasticManaged,
    http,
    application,
    updateOrigin,
    closeCanvas,
    setSaveState,
  });

  // Keep the framework header buttons clear — the action footer below
  // owns the Create / Update / View affordance now. We still need to
  // call `registerActionButtons` (rather than no-op) because the
  // framework may have leftover buttons from a previous attachment.
  useEffect(() => {
    registerActionButtons([]);
  }, [registerActionButtons]);

  const monitorName = effectiveData[ConfigKey.NAME];
  const url = effectiveData[ConfigKey.URLS];
  const placeholderName = i18n.translate(
    'xpack.synthetics.agentBuilder.monitor.canvas.placeholderName',
    { defaultMessage: 'Untitled monitor' }
  );
  const tileTitle = monitorName && monitorName.length > 0 ? monitorName : placeholderName;
  const caption = getStatusCaption(status);

  return (
    <div
      data-test-subj="syntheticsMonitorAttachmentCanvas"
      data-test-status={status}
      // The agent_builder flyout body only sets `padding-top: m` (see
      // `canvas_flyout.tsx`'s `flyoutBodyStyles`), so without our own
      // wrapper the tile + action footer would sit flush against the
      // flyout edges. Pad uniformly so the tile reads as a card with
      // breathing room and the footer doesn't kiss the right edge.
      css={css`
        padding: 0 ${euiTheme.size.m} ${euiTheme.size.m};
      `}
    >
      {/*
        Local close affordance.

        The framework's `AttachmentHeader` (which normally renders the
        flyout title + close X) bails out with `return null` when
        `actionButtons.length === 0` — and we register an empty array so
        the framework header stays clean while we render the
        Create / Update / View buttons in our own body footer
        (T7 hot-fix #4 in `tasks.md`). Side effect: no framework
        header → no framework close X → users can only escape via
        outside-click / Escape, which isn't discoverable. Add a small
        close button at the top of the body so the affordance is
        always visible. Tracked as F13 in `followups.md` — the proper
        fix is in the platform's `attachment_header.tsx` to always
        render the close X.
      */}
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="syntheticsMonitorAttachmentCanvasCloseButton"
            aria-label={i18n.translate(
              'xpack.synthetics.agentBuilder.monitor.canvas.closeAriaLabel',
              { defaultMessage: 'Close monitor preview' }
            )}
            iconType="cross"
            color="text"
            size="xs"
            onClick={closeCanvas}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {/*
        Outer fixed-height shell mirrors the Overview tile (`MetricItem`):
        180px tall panel, the status-tinted background fills the entire
        card surface so the status reads at a glance.

        We add a thicker left accent strip (`MonitorStatusDot` plus a
        `border-left` on the panel) so the status colour reads even when
        the background tint is subtle (proposed → backgroundBasePrimary
        is very light in light mode).
      */}
      <div
        data-test-subj="syntheticsMonitorAttachmentCanvasTile"
        style={{ height: METRIC_TILE_HEIGHT }}
      >
        <EuiPanel
          paddingSize="l"
          hasBorder
          hasShadow={false}
          css={css`
            height: 100%;
            overflow: hidden;
            position: relative;
            background-color: ${tileBg};
            border-left: ${euiTheme.border.width.thick} solid ${accentColor};
          `}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <MonitorStatusDot status={status} />
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                min-width: 0;
              `}
            >
              <EuiTitle size="m">
                <h2
                  data-test-subj="syntheticsMonitorAttachmentCanvasTitle"
                  css={css`
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  `}
                >
                  {tileTitle}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xs" />

          <EuiText
            size="s"
            color="subdued"
            data-test-subj="syntheticsMonitorAttachmentCanvasCaption"
          >
            <p
              css={css`
                margin: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}
            >
              {caption}
              {url ? (
                <>
                  {' · '}
                  <EuiLink
                    href={url}
                    external
                    target="_blank"
                    data-test-subj="syntheticsMonitorAttachmentCanvasUrl"
                  >
                    <EuiIcon type="link" size="s" aria-hidden={true} /> {url}
                  </EuiLink>
                </>
              ) : null}
            </p>
          </EuiText>

          <EuiSpacer size="m" />

          <div data-test-subj="syntheticsMonitorAttachmentCanvasDetails">
            <MonitorChipRow data={effectiveData} />
          </div>
        </EuiPanel>
      </div>

      {status === 'cli-managed' ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            announceOnMount
            data-test-subj="syntheticsMonitorAttachmentCanvasCliManagedCallout"
            title={i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.cliManagedTitle', {
              defaultMessage: 'CLI-managed monitor',
            })}
          >
            <p>
              {i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.cliManagedBody', {
                defaultMessage:
                  'This monitor was created via the synthetics CLI and is read-only here. To edit it, update the project source and re-push with `@elastic/synthetics push`.',
              })}
            </p>
          </EuiCallOut>
        </>
      ) : null}

      {saveState.saveError ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            size="s"
            color="danger"
            iconType="error"
            announceOnMount
            data-test-subj="syntheticsMonitorAttachmentCanvasSaveError"
            title={i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.saveErrorTitle', {
              defaultMessage: 'Save failed',
            })}
          >
            <p>{saveState.saveError.message}</p>
          </EuiCallOut>
        </>
      ) : null}

      {saveState.locationWarnings.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            announceOnMount
            data-test-subj="syntheticsMonitorAttachmentCanvasLocationWarnings"
            title={i18n.translate(
              'xpack.synthetics.agentBuilder.monitor.canvas.locationWarningsTitle',
              {
                defaultMessage:
                  'Saved, but {count, plural, one {# location} other {# locations}} reported errors.',
                values: { count: saveState.locationWarnings.length },
              }
            )}
          >
            <ul>
              {saveState.locationWarnings.map((warning) => (
                <li key={warning.locationId}>
                  <strong>{warning.locationId}</strong>: {warning.message}
                </li>
              ))}
            </ul>
          </EuiCallOut>
        </>
      ) : null}

      {actionButtons.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <ActionFooter buttons={actionButtons} isSaving={saveState.isSaving} />
        </>
      ) : null}
    </div>
  );
};
