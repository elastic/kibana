/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, type EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConfigKey } from '../../../common/runtime_types';
import {
  MonitorTypeEnum,
  SourceType,
} from '../../../common/runtime_types/monitor_management/monitor_configs';
import type { MonitorAttachmentData } from '../../../common/agent_builder';

/**
 * Status the agent_builder UI surfaces for a monitor attachment.
 * Derived from the attachment payload — never from request state.
 *
 * - `proposed`     — no `config_id` yet; user can Save to create it.
 * - `enabled`      — saved + `enabled: true`.
 * - `disabled`     — saved + `enabled: false`.
 * - `cli-managed`  — `origin: project`. Read-only via the agent.
 *
 * Shared between `monitor_management_inline_content.tsx` and
 * `monitor_management_canvas_content.tsx` so both surfaces classify
 * the attachment identically.
 */
export type MonitorAgentStatus = 'proposed' | 'enabled' | 'disabled' | 'cli-managed';

export const inferMonitorStatus = (data: MonitorAttachmentData): MonitorAgentStatus => {
  if (data[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
    return 'cli-managed';
  }
  if (!data[ConfigKey.CONFIG_ID]) {
    return 'proposed';
  }
  return data[ConfigKey.ENABLED] ? 'enabled' : 'disabled';
};

export const STATUS_BADGE_COLORS: Record<
  MonitorAgentStatus,
  'hollow' | 'default' | 'success' | 'warning'
> = {
  proposed: 'hollow',
  enabled: 'success',
  disabled: 'default',
  'cli-managed': 'warning',
};

/**
 * Maps each agent status to an EUI semantic color token used for the
 * left accent strip / canvas heading bar. Mirrors the **intent** of
 * the Synthetics Overview tile (`MetricItem`'s `getColor`) without
 * inheriting its runtime up/down assumptions — proposed monitors
 * have no heartbeat data, so we lean on `primary` / `success` /
 * `warning` / `subduedText` rather than the Overview's
 * danger/success palette.
 */
export const getStatusAccentColor = (
  status: MonitorAgentStatus,
  euiTheme: EuiThemeComputed
): string => {
  switch (status) {
    case 'proposed':
      return euiTheme.colors.primary;
    case 'enabled':
      return euiTheme.colors.success;
    case 'disabled':
      return euiTheme.colors.subduedText;
    case 'cli-managed':
      return euiTheme.colors.warning;
  }
};

/**
 * Tile-background color for the canvas card. Mirrors the **intent** of
 * the Synthetics Overview tile (`MetricItem`'s `getColor`): the panel
 * itself is washed with a status-tinted base, not just bordered with
 * an accent strip. Up/down semantics don't apply (no heartbeat data
 * for proposed monitors), so we map the agent lifecycle states onto
 * `backgroundBase*` tokens that EUI guarantees are AA-contrast against
 * `text` on both themes:
 *
 * - `proposed`    — `backgroundBasePrimary` (light blue: actionable draft)
 * - `enabled`     — `backgroundBaseSuccess` (light green: saved & running)
 * - `disabled`    — `backgroundBaseDisabled` (grey: saved but paused)
 * - `cli-managed` — `backgroundBaseWarning` (light yellow: read-only via CLI)
 */
export const getStatusBackgroundColor = (
  status: MonitorAgentStatus,
  euiTheme: EuiThemeComputed
): string => {
  switch (status) {
    case 'proposed':
      return euiTheme.colors.backgroundBasePrimary;
    case 'enabled':
      return euiTheme.colors.backgroundBaseSuccess;
    case 'disabled':
      return euiTheme.colors.backgroundBaseDisabled;
    case 'cli-managed':
      return euiTheme.colors.backgroundBaseWarning;
  }
};

/**
 * One-line status caption rendered immediately under the canvas title.
 * Stands in for the Overview tile's *"Up in {location}"* subtitle —
 * we don't have heartbeat data, but we can still tell the user what
 * lifecycle state the attachment is in and whether it's actionable.
 */
export const getStatusCaption = (status: MonitorAgentStatus): string => {
  switch (status) {
    case 'proposed':
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.status.proposedCaption', {
        defaultMessage: 'Draft monitor — not yet saved to Synthetics.',
      });
    case 'enabled':
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.status.enabledCaption', {
        defaultMessage: 'Saved monitor — currently running on its schedule.',
      });
    case 'disabled':
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.status.disabledCaption', {
        defaultMessage: 'Saved monitor — currently paused.',
      });
    case 'cli-managed':
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.status.cliManagedCaption', {
        defaultMessage: 'Managed by the synthetics CLI — read-only here.',
      });
  }
};

export const getStatusLabel = (status: MonitorAgentStatus): string => {
  switch (status) {
    case 'proposed':
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.status.proposed', {
        defaultMessage: 'Proposed',
      });
    case 'enabled':
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.status.enabled', {
        defaultMessage: 'Enabled',
      });
    case 'disabled':
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.status.disabled', {
        defaultMessage: 'Disabled',
      });
    case 'cli-managed':
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.status.cliManaged', {
        defaultMessage: 'CLI-managed',
      });
  }
};

/**
 * Inline equivalent of `MonitorTypeBadge` from
 * `apps/synthetics/components/common/components/monitor_type_badge.tsx`.
 *
 * We deliberately don't import that component: the agent_builder
 * inline / canvas chunks must avoid `apps/synthetics/components/`
 * imports for tree-shake hygiene, and the SPA component drags in
 * `react-router-dom` (for its on-click filter navigation) which has
 * no place inside an Agent Builder conversation. This re-implements
 * just the visual — same icon, same label scheme — without the click
 * handler.
 */
const getMonitorTypeIcon = (type: string | undefined): string =>
  type === MonitorTypeEnum.BROWSER ? 'videoPlayer' : 'online';

const getMonitorTypeLabel = (type: string | undefined): string => {
  switch (type) {
    case MonitorTypeEnum.HTTP:
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.type.http', {
        defaultMessage: 'HTTP',
      });
    case MonitorTypeEnum.TCP:
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.type.tcp', {
        defaultMessage: 'TCP',
      });
    case MonitorTypeEnum.ICMP:
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.type.icmp', {
        defaultMessage: 'ICMP',
      });
    case MonitorTypeEnum.BROWSER:
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.type.journey', {
        defaultMessage: 'Journey',
      });
    default:
      return i18n.translate('xpack.synthetics.agentBuilder.monitor.type.unknown', {
        defaultMessage: 'Monitor',
      });
  }
};

interface MonitorTypeChipProps {
  type: string | undefined;
}

export const MonitorTypeChip: React.FC<MonitorTypeChipProps> = ({ type }) => {
  const label = getMonitorTypeLabel(type);
  return (
    <EuiBadge
      iconType={getMonitorTypeIcon(type)}
      color="hollow"
      data-test-subj="syntheticsMonitorAttachmentType"
      aria-label={i18n.translate('xpack.synthetics.agentBuilder.monitor.type.ariaLabel', {
        defaultMessage: 'Monitor type: {label}',
        values: { label },
      })}
    >
      {label}
    </EuiBadge>
  );
};
