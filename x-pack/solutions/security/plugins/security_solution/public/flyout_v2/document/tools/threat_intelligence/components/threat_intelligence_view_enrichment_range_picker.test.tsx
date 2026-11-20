/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../../common/mock';
import { EnrichmentRangePicker } from './threat_intelligence_view_enrichment_range_picker';
import {
  THREAT_INTELLIGENCE_ENRICHMENTS_RANGE_PICKER_TEST_ID,
  THREAT_INTELLIGENCE_ENRICHMENTS_REFRESH_BUTTON_TEST_ID,
} from './test_ids';

describe('EnrichmentRangePicker', () => {
  const setRangeSpy = jest.fn();

  const rangePickerProps = {
    loading: false,
    setRange: setRangeSpy,
    range: { to: 'now', from: 'now-30d' },
  };

  it('renders a date picker and a button', () => {
    render(
      <TestProviders>
        <EnrichmentRangePicker {...rangePickerProps} />
      </TestProviders>
    );

    expect(
      screen.getByTestId(THREAT_INTELLIGENCE_ENRICHMENTS_RANGE_PICKER_TEST_ID)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(THREAT_INTELLIGENCE_ENRICHMENTS_REFRESH_BUTTON_TEST_ID)
    ).toBeInTheDocument();
  });

  it('invokes setRange', async () => {
    render(
      <TestProviders>
        <EnrichmentRangePicker {...rangePickerProps} />
      </TestProviders>
    );

    await userEvent.click(
      screen.getByTestId(THREAT_INTELLIGENCE_ENRICHMENTS_REFRESH_BUTTON_TEST_ID)
    );

    expect(setRangeSpy).toHaveBeenCalled();
  });
});
