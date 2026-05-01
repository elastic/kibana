/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConfigKey } from '../../../common/runtime_types';
import type { ScheduleUnit } from '../../../common/runtime_types/monitor_management/monitor_configs';
import type { MonitorAttachmentData } from '../../../common/agent_builder';
import {
  MonitorTypeChip,
  STATUS_BADGE_COLORS,
  getStatusAccentColor,
  getStatusLabel,
  inferMonitorStatus,
} from './monitor_management_status';

interface MetaItemProps {
  iconType: string;
  label: string;
  value: string;
  testSubj: string;
}

const MetaItem = ({ iconType, label, value, testSubj }: MetaItemProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false} data-test-subj={testSubj}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={iconType}
            size="s"
            color={euiTheme.colors.subduedText}
            aria-hidden={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <strong>{label}</strong> {value}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

const formatSchedule = (schedule: { number: string; unit: ScheduleUnit } | undefined): string => {
  if (!schedule) {
    return i18n.translate('xpack.synthetics.agentBuilder.monitor.scheduleNotSet', {
      defaultMessage: 'not set',
    });
  }
  return i18n.translate('xpack.synthetics.agentBuilder.monitor.scheduleValue', {
    defaultMessage: 'every {number}{unit}',
    values: { number: schedule.number, unit: schedule.unit },
  });
};

export interface MonitorManagementInlineContentProps {
  data: MonitorAttachmentData;
}

/**
 * Inline card body for the `MONITOR_MANAGEMENT_ATTACHMENT_TYPE` attachment.
 *
 * Visual conventions intentionally borrow from the Synthetics Overview
 * tile (`MetricItem`) without inheriting its data dependencies:
 *
 * - The left accent strip mirrors the Overview tile's status-coloured
 *   panel background, but mapped onto our agent-side statuses
 *   (`proposed` / `enabled` / `disabled` / `cli-managed`) which don't
 *   correspond 1:1 to up/down heartbeat states.
 * - `MonitorTypeChip` reproduces the Overview's `MonitorTypeBadge`
 *   visual without dragging in router / Redux.
 *
 * What we deliberately **don't** render here (kept for the canvas, T7):
 * sparkline trend, last-status icon, latency metric, error popover,
 * actions popover, location flags. All of those depend on heartbeat
 * data that doesn't exist for proposed monitors and would require
 * pulling in `@elastic/charts` + the synthetics Redux store.
 *
 * No heading is rendered — the agent_builder framework already renders
 * the attachment label/icon above the inline content slot, so a heading
 * here would double up.
 *
 * Tree-shake hygiene: this file imports only `@elastic/eui`,
 * `@emotion/react`, `@kbn/i18n`, types from `common/`, and the shared
 * `monitor_management_status` helpers in the same folder. **Do not**
 * pull in monitor-form or anything from `apps/synthetics/components/` —
 * those would balloon the inline chunk.
 */
export const MonitorManagementInlineContent: React.FC<MonitorManagementInlineContentProps> = ({
  data,
}) => {
  const { euiTheme } = useEuiTheme();
  const status = inferMonitorStatus(data);
  const accentColor = getStatusAccentColor(status, euiTheme);
  const locations = data[ConfigKey.LOCATIONS] ?? [];
  const tags = data[ConfigKey.TAGS] ?? [];
  const url = data[ConfigKey.URLS];
  const schedule = data[ConfigKey.SCHEDULE];
  const monitorType = data[ConfigKey.MONITOR_TYPE];

  const locationsLabel = i18n.translate('xpack.synthetics.agentBuilder.monitor.locationsCount', {
    defaultMessage: '{count, plural, one {# location} other {# locations}}',
    values: { count: locations.length },
  });

  return (
    <div
      data-test-subj="syntheticsMonitorAttachmentInline"
      data-test-status={status}
      css={css`
        border-left: ${euiTheme.border.width.thick} solid ${accentColor};
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={STATUS_BADGE_COLORS[status]}
            data-test-subj={`syntheticsMonitorAttachmentStatus-${status}`}
          >
            {getStatusLabel(status)}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MonitorTypeChip type={monitorType} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="m" wrap responsive={false}>
        <MetaItem
          iconType="clock"
          testSubj="syntheticsMonitorAttachmentSchedule"
          label={i18n.translate('xpack.synthetics.agentBuilder.monitor.scheduleLabel', {
            defaultMessage: 'Schedule:',
          })}
          value={formatSchedule(schedule)}
        />
        <MetaItem
          iconType="visMapCoordinate"
          testSubj="syntheticsMonitorAttachmentLocations"
          label={i18n.translate('xpack.synthetics.agentBuilder.monitor.locationsLabel', {
            defaultMessage: 'Locations:',
          })}
          value={locationsLabel}
        />
        {url ? (
          <MetaItem
            iconType="link"
            testSubj="syntheticsMonitorAttachmentUrl"
            label={i18n.translate('xpack.synthetics.agentBuilder.monitor.urlLabel', {
              defaultMessage: 'URL:',
            })}
            value={url}
          />
        ) : null}
      </EuiFlexGroup>

      {tags.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiBadgeGroup data-test-subj="syntheticsMonitorAttachmentTags">
            {tags.map((tag) => (
              <EuiBadge key={tag} color="hollow">
                {tag}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        </>
      ) : null}
    </div>
  );
};
