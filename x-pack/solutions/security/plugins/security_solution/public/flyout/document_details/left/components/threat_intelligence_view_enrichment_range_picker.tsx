/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { memo, useMemo, useState, useCallback } from 'react';
import {
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import {
  THREAT_INTELLIGENCE_ENRICHMENTS_RANGE_PICKER_TEST_ID,
  THREAT_INTELLIGENCE_ENRICHMENTS_REFRESH_BUTTON_TEST_ID,
} from './test_ids';
import {
  DEFAULT_EVENT_ENRICHMENT_FROM,
  DEFAULT_EVENT_ENRICHMENT_TO,
} from '../../../../../common/cti/constants';

const ENRICHMENT_LOOKBACK_START_DATE = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.enrichmentQueryStartDate',
  {
    defaultMessage: 'Start date',
  }
);

const ENRICHMENT_LOOKBACK_END_DATE = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.enrichmentQueryEndDate',
  {
    defaultMessage: 'End date',
  }
);

const REFRESH = i18n.translate('xpack.securitySolution.flyout.threatIntelligence.refresh', {
  defaultMessage: 'Refresh',
});

export interface RangePickerProps {
  /**
   * The range of the picker
   */
  range: { to: string; from: string };
  /**
   * Set the range of the picker
   */
  setRange: ({ to, from }: { to: string; from: string }) => void;
  /**
   * Whether the picker is loading
   */
  loading: boolean;
}

/**
 * A component that allows the user to select a range of dates for enrichment
 */
export const EnrichmentRangePicker = memo(({ range, setRange, loading }: RangePickerProps) => {
  const [startDate, setStartDate] = useState<moment.Moment | null>(
    range.from === DEFAULT_EVENT_ENRICHMENT_FROM ? moment().subtract(30, 'd') : moment(range.from)
  );
  const [endDate, setEndDate] = useState<moment.Moment | null>(
    range.to === DEFAULT_EVENT_ENRICHMENT_TO ? moment() : moment(range.to)
  );

  const onButtonClick = useCallback(() => {
    if (startDate && endDate && startDate.isBefore(endDate)) {
      setRange({
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      });
    }
  }, [endDate, setRange, startDate]);

  const isValid = useMemo(() => startDate?.isBefore(endDate), [startDate, endDate]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiDatePickerRange
          data-test-subj={THREAT_INTELLIGENCE_ENRICHMENTS_RANGE_PICKER_TEST_ID}
          startDateControl={
            <EuiDatePicker
              className="start-picker"
              selected={startDate}
              onChange={setStartDate}
              startDate={startDate}
              endDate={endDate}
              isInvalid={!isValid}
              aria-label={ENRICHMENT_LOOKBACK_START_DATE}
              showTimeSelect
            />
          }
          endDateControl={
            <EuiDatePicker
              className="end-picker"
              selected={endDate}
              onChange={setEndDate}
              startDate={startDate}
              endDate={endDate}
              isInvalid={!isValid}
              aria-label={ENRICHMENT_LOOKBACK_END_DATE}
              showTimeSelect
            />
          }
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType={'refresh'}
          onClick={onButtonClick}
          isLoading={loading}
          data-test-subj={THREAT_INTELLIGENCE_ENRICHMENTS_REFRESH_BUTTON_TEST_ID}
          isDisabled={!isValid}
        >
          {REFRESH}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

EnrichmentRangePicker.displayName = 'EnrichmentRangePicker';
