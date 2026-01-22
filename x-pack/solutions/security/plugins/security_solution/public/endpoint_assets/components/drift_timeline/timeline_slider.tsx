/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiDualRange,
  EuiText,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import type { DriftHistogramBucket } from '../../../../../../common/endpoint_assets/types';
import { useTimelinePositions } from './use_timeline_positions';
import { TIME_MARKERS, TIMELINE_DEFAULTS } from './constants';

export interface TimelineSliderProps {
  referenceTime: Date;
  rangeStart: Date;
  rangeEnd: Date;
  histogramData?: DriftHistogramBucket[];
  onRangeChange: (start: Date, end: Date) => void;
  minGranularity?: number;
  totalRange?: number;
  isLoading?: boolean;
}

const formatRelativeTime = (minutes: number): string => {
  const absMinutes = Math.abs(minutes);
  const sign = minutes < 0 ? '-' : '+';
  if (absMinutes >= 60) {
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return mins > 0 ? `${sign}${hours}h ${mins}m` : `${sign}${hours}h`;
  }
  return `${sign}${absMinutes}m`;
};

export const TimelineSlider: React.FC<TimelineSliderProps> = React.memo(
  ({
    referenceTime,
    rangeStart,
    rangeEnd,
    histogramData = [],
    onRangeChange,
    minGranularity = TIMELINE_DEFAULTS.MIN_GRANULARITY_MS,
    totalRange = TIMELINE_DEFAULTS.TOTAL_RANGE_MS,
    isLoading = false,
  }) => {
    const { euiTheme } = useEuiTheme();
    const { timeToPosition, positionToTime, snapToGrid, getRelativeMinutes } =
      useTimelinePositions({
        referenceTime,
        totalRangeMs: totalRange,
        minGranularityMs: minGranularity,
      });

    const [localRange, setLocalRange] = useState<[number, number]>(() => [
      timeToPosition(rangeStart) * 100,
      timeToPosition(rangeEnd) * 100,
    ]);

    useEffect(() => {
      setLocalRange([timeToPosition(rangeStart) * 100, timeToPosition(rangeEnd) * 100]);
    }, [rangeStart, rangeEnd, timeToPosition]);

    const handleRangeChange = useCallback(
      (value: [number, number] | number) => {
        const [startPos, endPos] = Array.isArray(value) ? value : [value, value];
        setLocalRange([startPos, endPos]);
      },
      []
    );

    const handleChangeComplete = useCallback(() => {
      const [startPos, endPos] = localRange;
      const startTime = snapToGrid(positionToTime(startPos / 100));
      const endTime = snapToGrid(positionToTime(endPos / 100));

      if (startTime < endTime) {
        onRangeChange(startTime, endTime);
      }
    }, [localRange, positionToTime, snapToGrid, onRangeChange]);

    const maxHistogramCount = useMemo(() => {
      if (!histogramData || histogramData.length === 0) return 0;
      return Math.max(...histogramData.map((bucket) => bucket.count));
    }, [histogramData]);

    const histogramBars = useMemo(() => {
      if (!histogramData || histogramData.length === 0 || maxHistogramCount === 0) return null;

      return histogramData.map((bucket, index) => {
        const bucketTime = new Date(bucket.timestamp);
        const position = timeToPosition(bucketTime);
        const height = (bucket.count / maxHistogramCount) * 100;

        if (position < 0 || position > 1) return null;

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${position * 100}%`,
              bottom: 0,
              width: '2px',
              height: `${Math.max(2, height)}%`,
              backgroundColor: euiTheme.colors.primary,
              opacity: 0.6,
              transform: 'translateX(-50%)',
            }}
          />
        );
      });
    }, [histogramData, maxHistogramCount, timeToPosition, euiTheme.colors.primary]);

    return (
      <div>
        {/* Time markers positioned at their actual time positions */}
        <div style={{ position: 'relative', height: '20px', marginBottom: euiTheme.size.xs }}>
          {TIME_MARKERS.map((marker) => {
            const markerTime = new Date(referenceTime.getTime() + marker.value * 60 * 1000);
            const position = timeToPosition(markerTime);

            if (position < 0 || position > 1) return null;

            return (
              <div
                key={marker.value}
                style={{
                  position: 'absolute',
                  left: `${position * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <EuiText
                  size="xs"
                  color="subdued"
                  style={{
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {marker.label}
                </EuiText>
              </div>
            );
          })}
        </div>

        <div style={{ position: 'relative', marginTop: euiTheme.size.s }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '30px',
              borderRadius: euiTheme.border.radius.medium,
              backgroundColor: euiTheme.colors.lightestShade,
              overflow: 'hidden',
            }}
          >
            {histogramBars}
            {/* "Now" indicator at the right edge */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                backgroundColor: euiTheme.colors.danger,
                zIndex: 1,
              }}
            />
          </div>

          <div style={{ position: 'relative', paddingTop: '40px' }}>
            <EuiDualRange
              min={0}
              max={100}
              step={1}
              value={localRange}
              onChange={handleRangeChange}
              onBlur={handleChangeComplete}
              onMouseUp={handleChangeComplete}
              showInput={false}
              showLabels={false}
              showTicks={false}
              fullWidth
              aria-label="Time range selector"
            />
          </div>
        </div>

        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              Selected: {formatRelativeTime(getRelativeMinutes(rangeStart))} to{' '}
              {formatRelativeTime(getRelativeMinutes(rangeEnd))}
            </EuiText>
          </EuiFlexItem>
          {isLoading && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    );
  }
);

TimelineSlider.displayName = 'TimelineSlider';
