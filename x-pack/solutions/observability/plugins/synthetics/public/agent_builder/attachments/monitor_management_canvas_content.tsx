/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
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
import type { ScheduleUnit } from '../../../common/runtime_types/monitor_management/monitor_configs';
import type { MonitorAttachmentData } from '../../../common/agent_builder';
import {
  MonitorTypeChip,
  STATUS_BADGE_COLORS,
  getStatusBackgroundColor,
  getStatusCaption,
  getStatusLabel,
  inferMonitorStatus,
} from './monitor_management_status';
import {
  useMonitorCanvasActions,
  type MonitorCanvasSaveState,
} from './use_monitor_canvas_actions';

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

const formatScheduleLabel = (
  schedule: { number: string; unit: ScheduleUnit } | undefined
): string => {
  if (!schedule) {
    return i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.scheduleUnset', {
      defaultMessage: 'Schedule not set',
    });
  }
  return i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.scheduleValue', {
    defaultMessage: 'Every {number} {unit}',
    values: { number: schedule.number, unit: schedule.unit },
  });
};

const formatLocationLabel = (location: {
  id: string;
  label?: string;
  isServiceManaged?: boolean;
}): string => {
  const labelText = location.label ?? location.id;
  if (location.isServiceManaged) {
    return i18n.translate(
      'xpack.synthetics.agentBuilder.monitor.canvas.locations.elasticManagedLabel',
      {
        defaultMessage: '{label} (Elastic-managed)',
        values: { label: labelText },
      }
    );
  }
  return labelText;
};

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
 * Visual treatment intentionally mirrors the Synthetics Overview tile
 * (`MetricItem`): the panel itself is washed with a status-tinted
 * background, the title sits prominent at the top, and the type chip
 * + tags ride in a dedicated chip row. We deliberately do **not**
 * inherit the heavy bits of `MetricItem` — sparkline trend chart,
 * latency metric, errors popover, actions popover — because:
 *
 * - Those depend on heartbeat data + Redux selectors that have no
 *   meaning for a `proposed` (unsaved) monitor.
 * - The flyout context is detail-oriented; cramming a sparkline into
 *   it duplicates the Synthetics Overview without adding new info.
 *
 * Read-only by design: the user mutates the attachment via chat
 * (re-running `manage_synthetics_monitor` operations), then commits
 * the result via the action footer. Editing inline here would
 * require duplicating the synthetics monitor form and its validation
 * surface, which is out of scope for v1.
 *
 * Action placement (T7 hot-fix #4): the Create / Update / View
 * buttons live **inside the panel footer**, not in the framework's
 * flyout header. That decision is rationalised in the
 * `useMonitorCanvasActions` doc comment. We still call
 * `registerActionButtons([])` once per mount to clear any header
 * buttons the framework may have carried over from a previous
 * canvas attachment.
 *
 * Tree-shake hygiene: like the inline content body, this file only
 * imports `@elastic/eui`, `@emotion/react`, `@kbn/i18n`,
 * `@kbn/agent-builder-browser`, `@kbn/core/public`, types from
 * `common/`, and the shared `monitor_management_status` /
 * `monitor_management_actions` / `use_monitor_canvas_actions`
 * helpers in this folder. **Do not** pull in monitor-form or anything
 * from `apps/synthetics/components/`.
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
  const status = inferMonitorStatus(data);
  const tileBg = getStatusBackgroundColor(status, euiTheme);

  const capabilities = application.capabilities;
  const canEdit = capabilities.uptime?.save === true;
  const canUseElasticManaged = (capabilities.uptime?.elasticManagedLocationsEnabled ??
    true) as boolean;

  const [saveState, setSaveState] = useState<MonitorCanvasSaveState>({
    isSaving: false,
    saveError: null,
    locationWarnings: [],
  });

  const actionButtons = useMonitorCanvasActions({
    monitor: data,
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

  const monitorName = data[ConfigKey.NAME];
  const url = data[ConfigKey.URLS];

  return (
    <div data-test-subj="syntheticsMonitorAttachmentCanvas" data-test-status={status}>
      <EuiPanel
        paddingSize="l"
        hasBorder
        hasShadow={false}
        css={css`
          background-color: ${tileBg};
        `}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={STATUS_BADGE_COLORS[status]}
              data-test-subj={`syntheticsMonitorAttachmentCanvasStatus-${status}`}
            >
              {getStatusLabel(status)}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <MonitorTypeChip type={data[ConfigKey.MONITOR_TYPE]} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiTitle size="m">
          <h2 data-test-subj="syntheticsMonitorAttachmentCanvasTitle">
            {monitorName && monitorName.length > 0
              ? monitorName
              : i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.placeholderName', {
                  defaultMessage: 'Untitled monitor',
                })}
          </h2>
        </EuiTitle>

        <EuiSpacer size="xs" />

        <EuiText
          size="s"
          color="subdued"
          data-test-subj="syntheticsMonitorAttachmentCanvasCaption"
        >
          {getStatusCaption(status)}
        </EuiText>

        {status === 'cli-managed' ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              size="s"
              color="warning"
              iconType="warning"
              announceOnMount
              data-test-subj="syntheticsMonitorAttachmentCanvasCliManagedCallout"
              title={i18n.translate(
                'xpack.synthetics.agentBuilder.monitor.canvas.cliManagedTitle',
                { defaultMessage: 'CLI-managed monitor' }
              )}
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

        <EuiSpacer size="m" />

        {/*
         * Body layout intentionally mirrors `MetricItemBody` from the
         * Synthetics Overview tile: prominent target (URL), then a
         * single chip row that aggregates schedule + locations + tags
         * + paused-state. Avoids the visual weight of a description
         * list while still surfacing every field the user needs to
         * sanity-check before clicking Create.
         */}
        <div data-test-subj="syntheticsMonitorAttachmentCanvasDetails">
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            data-test-subj="syntheticsMonitorAttachmentCanvasUrl"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="link" size="s" color="subdued" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              {url ? (
                <EuiLink
                  href={url}
                  external
                  target="_blank"
                  data-test-subj="syntheticsMonitorAttachmentCanvasUrlLink"
                >
                  {url}
                </EuiLink>
              ) : (
                <EuiText size="s" color="subdued">
                  {i18n.translate(
                    'xpack.synthetics.agentBuilder.monitor.canvas.fields.urlUnset',
                    { defaultMessage: 'No URL set' }
                  )}
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiBadgeGroup
            gutterSize="xs"
            data-test-subj="syntheticsMonitorAttachmentCanvasMeta"
          >
            <EuiBadge color="hollow" iconType="clock">
              {formatScheduleLabel(data[ConfigKey.SCHEDULE])}
            </EuiBadge>
            {(data[ConfigKey.LOCATIONS] ?? []).map((location) => (
              <EuiBadge key={location.id} color="hollow" iconType="visMapCoordinate">
                {formatLocationLabel(location)}
              </EuiBadge>
            ))}
            {(data[ConfigKey.LOCATIONS] ?? []).length === 0 ? (
              <EuiBadge color="hollow" iconType="visMapCoordinate">
                {i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.locationsUnset', {
                  defaultMessage: 'No locations selected',
                })}
              </EuiBadge>
            ) : null}
            {(data[ConfigKey.TAGS] ?? []).map((tag) => (
              <EuiBadge key={tag} color="hollow">
                {tag}
              </EuiBadge>
            ))}
            {!data[ConfigKey.ENABLED] && status !== 'cli-managed' ? (
              <EuiBadge
                color="default"
                iconType="pause"
                data-test-subj="syntheticsMonitorAttachmentCanvasPausedBadge"
              >
                {i18n.translate('xpack.synthetics.agentBuilder.monitor.canvas.pausedBadge', {
                  defaultMessage: 'Paused',
                })}
              </EuiBadge>
            ) : null}
          </EuiBadgeGroup>
        </div>

        {actionButtons.length > 0 ? (
          <>
            <EuiHorizontalRule margin="m" />
            <ActionFooter buttons={actionButtons} isSaving={saveState.isSaving} />
          </>
        ) : null}
      </EuiPanel>
    </div>
  );
};
