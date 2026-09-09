/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import dateMath from '@kbn/datemath';
import {
  DateRangePicker,
  type DateRangePickerOnChangeProps,
  type DateRangePickerSettings,
} from '@kbn/date-range-picker';
import type {
  LogExplorationData,
  LogExplorationRefinement,
  LogExplorationTimeRange,
} from '../../../common/log_exploration';
import { refinementKey } from '../../../common/log_exploration';
import type { LogExplorationAction } from './use_log_exploration_state';

interface ExplorationControlsProps {
  data: LogExplorationData;
  dispatch: (action: LogExplorationAction) => void;
  isReadOnly: boolean;
  isFetching: boolean;
}

const truncate = (value: string) => (value.length > 40 ? `${value.slice(0, 40)}…` : value);

/**
 * Every refinement is a chip, so a new kind is visible and removable the moment it is storable —
 * the exhaustive switch is what makes that a compile error rather than a missing affordance.
 */
const refinementLabel = (refinement: LogExplorationRefinement): string => {
  switch (refinement.kind) {
    case 'exclude-pattern':
      return i18n.translate('xpack.observabilityAgentBuilder.logExploration.excludeChip', {
        defaultMessage: 'Muted: {pattern}',
        values: { pattern: truncate(refinement.pattern) },
      });
    case 'only-pattern':
      return i18n.translate('xpack.observabilityAgentBuilder.logExploration.onlyChip', {
        defaultMessage: 'Only: {pattern}',
        values: { pattern: truncate(refinement.pattern) },
      });
    case 'kql':
      return i18n.translate('xpack.observabilityAgentBuilder.logExploration.kqlChip', {
        defaultMessage: 'KQL: {query}',
        values: { query: truncate(refinement.query) },
      });
  }
};

/**
 * Keeps the baseline the same distance behind the window and the same length, so moving the range
 * does not silently turn a "24 hours earlier" comparison into an arbitrary one.
 */
const shiftBaselineEpoch = (
  data: LogExplorationData,
  next: LogExplorationTimeRange
): LogExplorationTimeRange | undefined => {
  if (data.view.type !== 'volume-comparison') {
    return undefined;
  }
  const previousStartMs = dateMath.parse(data.source.timeRange.start)?.valueOf();
  const baselineStartMs = dateMath.parse(data.view.baselineEpoch.start)?.valueOf();
  const nextStartMs = dateMath.parse(next.start)?.valueOf();
  const nextEndMs = dateMath.parse(next.end, { roundUp: true })?.valueOf();
  if (
    previousStartMs === undefined ||
    baselineStartMs === undefined ||
    nextStartMs === undefined ||
    nextEndMs === undefined
  ) {
    return undefined;
  }
  const offsetMs = previousStartMs - baselineStartMs;
  return {
    start: new Date(nextStartMs - offsetMs).toISOString(),
    end: new Date(nextEndMs - offsetMs).toISOString(),
  };
};

const DEFAULT_DATE_PICKER_SETTINGS: DateRangePickerSettings = {
  roundRelativeTime: false,
  timePrecision: 'none',
};

export const ExplorationControls: React.FC<ExplorationControlsProps> = ({
  data,
  dispatch,
  isReadOnly,
  isFetching,
}) => {
  const [settings, setSettings] = useState<DateRangePickerSettings>(DEFAULT_DATE_PICKER_SETTINGS);
  // The picker only shows the invalid state the consumer feeds back to it.
  const [isTimeRangeInvalid, setIsTimeRangeInvalid] = useState(false);

  const onTimeChange = useCallback(
    ({ start, end, isInvalid }: DateRangePickerOnChangeProps) => {
      setIsTimeRangeInvalid(isInvalid);
      if (isInvalid) {
        return;
      }
      // Shifting and zooming come through here too, so they cannot bypass the baseline shift.
      dispatch({
        type: 'SET_TIME_RANGE',
        timeRange: { start, end },
        baselineEpoch: shiftBaselineEpoch(data, { start, end }),
      });
    },
    [data, dispatch]
  );

  const onInputChange = useCallback(() => setIsTimeRangeInvalid(false), []);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <DateRangePicker
          compressed
          disabled={isReadOnly}
          isLoading={isFetching}
          isInvalid={isTimeRangeInvalid}
          value={`${data.source.timeRange.start} to ${data.source.timeRange.end}`}
          onChange={onTimeChange}
          onInputChange={onInputChange}
          settings={settings}
          onSettingsChange={setSettings}
          showTimeWindowButtons={{ showZoomIn: true }}
          width="auto"
        />
      </EuiFlexItem>
      {data.refinements.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.observabilityAgentBuilder.logExploration.refinementsLabel', {
                  defaultMessage: 'Filters:',
                })}
              </EuiText>
            </EuiFlexItem>
            {data.refinements.map((refinement) => {
              const key = refinementKey(refinement);
              return (
                <EuiFlexItem grow={false} key={key}>
                  {isReadOnly ? (
                    <EuiBadge color="hollow">{refinementLabel(refinement)}</EuiBadge>
                  ) : (
                    <EuiBadge
                      color="hollow"
                      iconType="cross"
                      iconSide="right"
                      iconOnClick={() => dispatch({ type: 'REMOVE_REFINEMENT', key })}
                      iconOnClickAriaLabel={i18n.translate(
                        'xpack.observabilityAgentBuilder.logExploration.removeRefinementAriaLabel',
                        { defaultMessage: 'Remove filter' }
                      )}
                    >
                      {refinementLabel(refinement)}
                    </EuiBadge>
                  )}
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
