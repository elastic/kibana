/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RiskScoreConfigurationSection } from './risk_score_configuration_section';
import { shallow, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiSuperDatePicker, EuiSwitch } from '@elastic/eui';
import * as i18n from '../translations';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useConfigureSORiskEngineMutation } from '../api/hooks/use_configure_risk_engine_saved_object';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/hooks/use_app_toasts');
jest.mock('../api/hooks/use_configure_risk_engine_saved_object');

describe('RiskScoreConfigurationSection', () => {
  const mockConfigureSO = useConfigureSORiskEngineMutation as jest.Mock;
  const defaultProps = {
    includeClosedAlerts: false,
    setIncludeClosedAlerts: jest.fn(),
    from: 'now-30m',
    to: 'now',
    onDateChange: jest.fn(),
  };

  const mockAddSuccess = jest.fn();
  const mockMutate = jest.fn();

  beforeEach(() => {
    (useAppToasts as jest.Mock).mockReturnValue({ addSuccess: mockAddSuccess });
    mockConfigureSO.mockReturnValue({ mutate: mockMutate });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const wrapper = shallow(<RiskScoreConfigurationSection {...defaultProps} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('toggles includeClosedAlerts', () => {
    const wrapper = mount(
      <RiskScoreConfigurationSection {...defaultProps} includeClosedAlerts={true} />
    );
    wrapper.find(EuiSwitch).simulate('click');
    expect(defaultProps.setIncludeClosedAlerts).toHaveBeenCalledWith(true);
  });

  it('calls onDateChange on date change', () => {
    const wrapper = mount(<RiskScoreConfigurationSection {...defaultProps} />);
    wrapper.find(EuiSuperDatePicker).props().onTimeChange({ start: 'now-30m', end: 'now' });
    expect(defaultProps.onDateChange).toHaveBeenCalledWith({ start: 'now-30m', end: 'now' });
  });

  it('shows bottom bar when changes are made', async () => {
    const wrapper = mount(
      <RiskScoreConfigurationSection {...defaultProps} includeClosedAlerts={false} />
    );
    wrapper.find(EuiSwitch).simulate('click');
    wrapper.find(EuiSuperDatePicker).props().onTimeChange({ start: 'now-14m', end: 'now' });
    wrapper.update();
    await new Promise((resolve) => setTimeout(resolve, 0)); // wait for the component to update
    expect(wrapper.find('EuiBottomBar').exists()).toBe(true);
  });

  it('saves changes', () => {
    const wrapper = mount(
      <RiskScoreConfigurationSection {...defaultProps} includeClosedAlerts={true} />
    );

    // Simulate clicking the switch
    const closedAlertsToggle = wrapper.find('button[data-test-subj="includeClosedAlertsSwitch"]');
    expect(closedAlertsToggle.exists()).toBe(true);
    closedAlertsToggle.simulate('click');

    wrapper.update();

    const saveChangesButton = wrapper.find('button[data-test-subj="riskScoreSaveButton"]');
    expect(saveChangesButton.exists()).toBe(true);
    saveChangesButton.simulate('click');
    const callArgs = mockMutate.mock.calls[0][0];
    expect(callArgs).toEqual({
      includeClosedAlerts: true,
      range: { start: 'now-30m', end: 'now' },
    });
  });

  it('shows success toast on save', () => {
    const wrapper = mount(
      <RiskScoreConfigurationSection {...defaultProps} includeClosedAlerts={true} />
    );

    act(() => {
      wrapper.find('button[data-test-subj="includeClosedAlertsSwitch"]').simulate('click');
    });
    wrapper.update();

    act(() => {
      wrapper.find('button[data-test-subj="riskScoreSaveButton"]').simulate('click');
    });

    act(() => {
      mockMutate.mock.calls[0][1].onSuccess();
    });

    expect(mockAddSuccess).toHaveBeenCalledWith(
      i18n.RISK_ENGINE_SAVED_OBJECT_CONFIGURATION_SUCCESS,
      {
        toastLifeTimeMs: 5000,
      }
    );
  });
});
