/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { TestProviders } from '../../../../common/mock';
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
    const wrapper = mount(
      <TestProviders>
        <EnrichmentRangePicker {...rangePickerProps} />
      </TestProviders>
    );

    expect(
      wrapper.exists(`[data-test-subj="${THREAT_INTELLIGENCE_ENRICHMENTS_RANGE_PICKER_TEST_ID}"]`)
    ).toEqual(true);
    expect(
      wrapper.exists(`[data-test-subj="${THREAT_INTELLIGENCE_ENRICHMENTS_REFRESH_BUTTON_TEST_ID}"]`)
    ).toEqual(true);
  });

  it('invokes setRange', () => {
    const wrapper = mount(
      <TestProviders>
        <EnrichmentRangePicker {...rangePickerProps} />
      </TestProviders>
    );

    wrapper
      .find('input.start-picker')
      .first()
      .simulate('change', { target: { value: '08/10/2019 06:29 PM' } });
    wrapper
      .find(`[data-test-subj="${THREAT_INTELLIGENCE_ENRICHMENTS_REFRESH_BUTTON_TEST_ID}"]`)
      .hostNodes()
      .simulate('click');

    expect(setRangeSpy).toHaveBeenCalled();
  });
});
