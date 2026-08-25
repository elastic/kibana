/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';
import { mockAnomalies } from '../mock';
import { createDescriptionList } from './create_description_list';
import { EuiDescriptionList } from '@elastic/eui';
import type { Anomaly } from '../types';
import { waitFor } from '@testing-library/react';

jest.mock('../../../lib/kibana');

const startDate: string = '2020-07-07T08:20:18.966Z';
const endDate: string = '3000-01-01T00:00:00.000Z';

describe('create_description_list', () => {
  let narrowDateRange = jest.fn();

  beforeEach(() => {
    narrowDateRange = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <EuiDescriptionList
        listItems={createDescriptionList(
          mockAnomalies.anomalies[0],
          startDate,
          endDate,
          'hours',
          narrowDateRange,
          'job-1'
        )}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('it calls the narrow date range function on click', async () => {
    const wrapper = mount(
      <EuiDescriptionList
        listItems={createDescriptionList(
          mockAnomalies.anomalies[0],
          startDate,
          endDate,
          'hours',
          narrowDateRange,
          'job-1'
        )}
      />
    );
    wrapper
      .find('[data-test-subj="anomaly-description-narrow-range-link"]')
      .last()
      .simulate('click');
    await waitFor(() => wrapper.update());

    expect(narrowDateRange.mock.calls.length).toBe(1);
  });

  test('it should the narrow date range with the score', async () => {
    const wrapper = mount(
      <EuiDescriptionList
        listItems={createDescriptionList(
          mockAnomalies.anomalies[0],
          startDate,
          endDate,
          'hours',
          narrowDateRange,
          'job-1'
        )}
      />
    );
    wrapper
      .find('[data-test-subj="anomaly-description-narrow-range-link"]')
      .last()
      .simulate('click');
    await waitFor(() => wrapper.update());

    const expected: Anomaly = {
      detectorIndex: 0,
      entityName: 'process.name',
      entityValue: 'du',
      influencers: [
        { 'host.name': 'zeek-iowa' },
        { 'process.name': 'du' },
        { 'user.name': 'root' },
      ],
      jobId: 'job-1',
      rowId: '1561157194802_0',
      severity: 16.193669439507826,
      source: {
        actual: [1],
        bucket_span: 900,
        by_field_name: 'process.name',
        by_field_value: 'du',
        detector_index: 0,
        function: 'rare',
        function_description: 'rare',
        influencers: [
          { influencer_field_name: 'user.name', influencer_field_values: ['root'] },
          { influencer_field_name: 'process.name', influencer_field_values: ['du'] },
          { influencer_field_name: 'host.name', influencer_field_values: ['zeek-iowa'] },
        ],
        initial_record_score: 16.193669439507826,
        is_interim: false,
        job_id: 'job-1',
        multi_bucket_impact: 0,
        partition_field_name: 'host.name',
        partition_field_value: 'zeek-iowa',
        probability: 0.024041164411288146,
        record_score: 16.193669439507826,
        result_type: 'record',
        timestamp: 1560664800000,
        typical: [0.024041164411288146],
      },
      time: 1560664800000,
    };
    expect(narrowDateRange.mock.calls[0][0]).toEqual(expected);
  });

  test('it should call the narrow date range with the interval', async () => {
    const wrapper = mount(
      <EuiDescriptionList
        listItems={createDescriptionList(
          mockAnomalies.anomalies[0],
          startDate,
          endDate,
          'hours',
          narrowDateRange,
          'job-1'
        )}
      />
    );
    wrapper
      .find('[data-test-subj="anomaly-description-narrow-range-link"]')
      .last()
      .simulate('click');
    await waitFor(() => wrapper.update());
    expect(narrowDateRange.mock.calls[0][1]).toEqual('hours');
  });
});
