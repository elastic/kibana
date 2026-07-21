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
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { Watch, WatchSchedule } from '@kbn/pnd-common';
import * as i18n from '../translations';

interface SchedulePanelProps {
  watch: Watch;
  /** POC: local-only projection edit; not written back to workflow YAML yet. */
  onScheduleChange?: (schedule: WatchSchedule) => void;
}

const CADENCE_OPTIONS = [
  { value: 'stream', text: i18n.CADENCE_STREAM },
  { value: 'sweep', text: i18n.CADENCE_SWEEP },
  { value: 'manual', text: i18n.CADENCE_MANUAL },
];

const HANDOFF_OPTIONS = [
  { value: 'officer', text: i18n.HANDOFF_OFFICER },
  { value: 'oncall', text: i18n.HANDOFF_ONCALL },
  { value: 'brief', text: i18n.HANDOFF_BRIEF },
  { value: 'records', text: i18n.HANDOFF_RECORDS },
  { value: 'none', text: i18n.HANDOFF_NONE },
];

export const SchedulePanel: React.FC<SchedulePanelProps> = ({ watch, onScheduleChange }) => {
  const { euiTheme } = useEuiTheme();
  const { schedule, coverage, color } = watch;

  const modeId =
    schedule.mode === 'always' ? 'always' : schedule.mode === 'demand' ? 'demand' : 'window';

  return (
    <EuiPanel hasBorder paddingSize="m">
      {watch.triggers.length > 0 ? (
        <>
          <EuiText size="xs" color="subdued">
            <p>{i18n.WORKFLOW_TRIGGERS_LABEL}</p>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            {watch.triggers.map((trigger) => (
              <EuiFlexItem grow={false} key={`${trigger.type}-${trigger.summary}`}>
                <EuiBadge
                  color="hollow"
                  iconType={
                    trigger.type === 'schedule'
                      ? 'clock'
                      : trigger.type === 'event'
                      ? 'bolt'
                      : 'play'
                  }
                >
                  {trigger.summary}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <p>{i18n.SCHEDULE_PROJECTION_NOTE}</p>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      ) : null}

      <EuiFormRow label={i18n.SCHEDULE_TITLE} fullWidth>
        <EuiButtonGroup
          legend={i18n.SCHEDULE_TITLE}
          idSelected={modeId}
          onChange={(id) => {
            if (!onScheduleChange) return;
            const mode = id === 'always' ? 'always' : id === 'demand' ? 'demand' : 'window';
            onScheduleChange({ ...schedule, mode, set: mode !== 'demand' });
          }}
          options={[
            { id: 'always', label: i18n.ALWAYS_ON },
            { id: 'window', label: i18n.TIME_BASED },
            { id: 'demand', label: i18n.ON_DEMAND },
          ]}
          buttonSize="compressed"
          color="primary"
          isFullWidth
        />
      </EuiFormRow>

      <div
        css={css`
          position: relative;
          height: 18px;
          margin: ${euiTheme.size.m} 0 ${euiTheme.size.xs};
          border-radius: ${euiTheme.border.radius.medium};
          background: ${euiTheme.colors.lightestShade};
          overflow: hidden;
        `}
        aria-hidden="true"
      >
        {coverage.map(([from, to], idx) => (
          <i
            key={`${from}-${to}-${idx}`}
            css={css`
              position: absolute;
              top: 3px;
              bottom: 3px;
              left: ${(from / 24) * 100}%;
              width: ${((to - from) / 24) * 100}%;
              border-radius: 3px;
              background: ${color};
              opacity: 0.85;
            `}
          />
        ))}
      </div>
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
        {['00:00', '06:00', '12:00', '18:00', '24:00'].map((h) => (
          <EuiFlexItem grow={false} key={h}>
            <EuiText size="xs" color="subdued">
              {h}
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <EuiFlexGroup gutterSize="m" style={{ marginTop: euiTheme.size.m }}>
        <EuiFlexItem>
          <EuiFormRow label={i18n.CADENCE_LABEL} fullWidth>
            <EuiSelect
              options={CADENCE_OPTIONS}
              value={schedule.cadence}
              onChange={(e) =>
                onScheduleChange?.({
                  ...schedule,
                  cadence: e.target.value as WatchSchedule['cadence'],
                })
              }
              compressed
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={i18n.HANDOFF_LABEL} fullWidth>
            <EuiSelect
              options={HANDOFF_OPTIONS}
              value={schedule.handoff}
              onChange={(e) =>
                onScheduleChange?.({
                  ...schedule,
                  handoff: e.target.value as WatchSchedule['handoff'],
                })
              }
              compressed
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
