/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';
import moment from 'moment';

import { EuiFieldNumber } from '@elastic/eui';

import { SyncJobType } from '../../../../types';

import { FrequencyItem } from './frequency_item';

describe('FrequencyItem', () => {
  const setSyncFrequency = jest.fn();
  const mockActions = {
    setSyncFrequency,
  };
  const mockValues = {
    contentSource: fullContentSources[0],
  };

  beforeEach(() => {
    setMockActions(mockActions);
    setMockValues(mockValues);
  });

  const estimate = {
    duration: 'PT3D',
    nextStart: '2021-09-27T21:39:24+00:00',
    lastRun: '2021-09-25T21:39:24+00:00',
  };

  const props = {
    type: 'full' as SyncJobType,
    label: 'Item',
    description: 'My item',
    duration: 'PT2D',
    estimate,
  };

  it('renders', () => {
    const wrapper = shallow(<FrequencyItem {...props} />);

    expect(wrapper.find(EuiFieldNumber)).toHaveLength(3);
  });

  describe('ISO8601 formatting', () => {
    it('handles minutes display', () => {
      const wrapper = shallow(<FrequencyItem {...props} duration="P1DT2H3M4S" />);

      expect(wrapper.find('[data-test-subj="durationMinutes"]').prop('value')).toEqual(3);
    });

    it('handles hours display', () => {
      const wrapper = shallow(<FrequencyItem {...props} duration="P1DT2H" />);

      expect(wrapper.find('[data-test-subj="durationHours"]').prop('value')).toEqual(2);
    });

    it('handles days display', () => {
      const wrapper = shallow(<FrequencyItem {...props} duration="P3D" />);

      expect(wrapper.find('[data-test-subj="durationDays"]').prop('value')).toEqual(3);
    });

    it('handles "nextStart" that is in past', () => {
      const wrapper = shallow(<FrequencyItem {...props} />);

      expect(
        (wrapper.find('[data-test-subj="nextStartSummary"]').prop('values') as any)!.nextStartTime
      ).toEqual('as soon as the currently running job finishes');
    });

    it('handles "nextStart" that is in future', () => {
      const estimateWithPastNextStart = {
        ...estimate,
        nextStart: moment().add(2, 'days').format(),
      };
      const wrapper = shallow(<FrequencyItem {...props} estimate={estimateWithPastNextStart} />);

      expect(
        (wrapper.find('[data-test-subj="nextStartSummary"]').prop('values') as any)!.nextStartTime
      ).toEqual('in 2 days');
    });
  });

  describe('onChange handlers', () => {
    it('calls setSyncFrequency for "days"', () => {
      const wrapper = shallow(<FrequencyItem {...props} />);
      wrapper
        .find('[data-test-subj="durationDays"]')
        .simulate('change', { target: { value: '3' } });

      expect(setSyncFrequency).toHaveBeenCalledWith('full', '3', 'days');
    });

    it('calls setSyncFrequency for "hours"', () => {
      const wrapper = shallow(<FrequencyItem {...props} />);
      wrapper
        .find('[data-test-subj="durationHours"]')
        .simulate('change', { target: { value: '3' } });

      expect(setSyncFrequency).toHaveBeenCalledWith('full', '3', 'hours');
    });

    it('calls setSyncFrequency for "minutes"', () => {
      const wrapper = shallow(<FrequencyItem {...props} />);
      wrapper
        .find('[data-test-subj="durationMinutes"]')
        .simulate('change', { target: { value: '3' } });

      expect(setSyncFrequency).toHaveBeenCalledWith('full', '3', 'minutes');
    });
  });

  it('handles edge case where estimate is empty', () => {
    const wrapper = shallow(<FrequencyItem {...props} estimate={{}} />);

    expect(wrapper.find('[data-test-subj="SyncEstimates"]')).toHaveLength(0);
  });
});
