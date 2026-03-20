/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { useDebounceFn } from '@kbn/react-hooks';
import type { DriftHistogramBucket } from '../../../../../../common/endpoint_assets/types';
import { TimelineSlider } from './timeline_slider';
import { DateTimePickerGroup } from './date_time_picker_group';
import { TIMELINE_DEFAULTS } from './constants';
import * as i18n from '../../pages/translations';

const DEBOUNCE_OPTIONS = { wait: 300 };

export interface DriftTimelineSelectorProps {
  referenceTime?: Date;
  initialStart?: Date;
  initialEnd?: Date;
  histogramData?: DriftHistogramBucket[];
  onRangeChange: (start: Date, end: Date) => void;
  isLoading?: boolean;
}

export const DriftTimelineSelector: React.FC<DriftTimelineSelectorProps> = React.memo(
  ({ referenceTime, initialStart, initialEnd, histogramData, onRangeChange, isLoading = false }) => {
    const effectiveReferenceTime = useMemo(
      () => referenceTime || new Date(),
      [referenceTime]
    );

    // Default: from 24h ago to now (no future times)
    const defaultStart = useMemo(
      () =>
        initialStart ||
        new Date(effectiveReferenceTime.getTime() - TIMELINE_DEFAULTS.TOTAL_RANGE_MS),
      [effectiveReferenceTime, initialStart]
    );

    const defaultEnd = useMemo(
      () => initialEnd || effectiveReferenceTime,
      [effectiveReferenceTime, initialEnd]
    );

    const [rangeStart, setRangeStart] = useState<Date>(defaultStart);
    const [rangeEnd, setRangeEnd] = useState<Date>(defaultEnd);
    const isInitialMount = useRef(true);

    // Debounced callback to avoid too many API calls during slider drag
    const { run: debouncedApplyRange } = useDebounceFn(
      (start: Date, end: Date) => {
        onRangeChange(start, end);
      },
      DEBOUNCE_OPTIONS
    );

    // Auto-apply changes when range changes (debounced)
    useEffect(() => {
      // Skip initial mount to avoid duplicate fetch
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      debouncedApplyRange(rangeStart, rangeEnd);
    }, [rangeStart, rangeEnd, debouncedApplyRange]);

    const handleSliderChange = useCallback((start: Date, end: Date) => {
      setRangeStart(start);
      setRangeEnd(end);
    }, []);

    const handleStartChange = useCallback((start: Date) => {
      setRangeStart(start);
    }, []);

    const handleEndChange = useCallback((end: Date) => {
      setRangeEnd(end);
    }, []);

    return (
      <EuiPanel hasBorder>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{i18n.DRIFT_TIMELINE_SELECTOR_TITLE}</h3>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem>
            <TimelineSlider
              referenceTime={effectiveReferenceTime}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              histogramData={histogramData}
              onRangeChange={handleSliderChange}
              isLoading={isLoading}
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <DateTimePickerGroup
              startTime={rangeStart}
              endTime={rangeEnd}
              onStartChange={handleStartChange}
              onEndChange={handleEndChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

DriftTimelineSelector.displayName = 'DriftTimelineSelector';
