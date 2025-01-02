/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../__mocks__/react_router';
import { sourceConfigData } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiConfirmModal } from '@elastic/eui';

import { SaveConfig } from '../../content_sources/components/add_source/save_config';

import { SourceConfig } from './source_config';

describe('SourceConfig', () => {
  const deleteSourceConfig = jest.fn();
  const getSourceConfigData = jest.fn();
  const saveSourceConfig = jest.fn();

  beforeEach(() => {
    setMockValues({ sourceConfigData, dataLoading: false });
    setMockActions({ deleteSourceConfig, getSourceConfigData, saveSourceConfig });
    mockUseParams.mockReturnValue({ serviceType: 'share_point' });
  });

  it('renders', () => {
    const wrapper = shallow(<SourceConfig />);
    const saveConfig = wrapper.find(SaveConfig);

    // Trigger modal visibility
    saveConfig.prop('onDeleteConfig')!();

    expect(wrapper.find(EuiConfirmModal)).toHaveLength(1);
    expect(wrapper.find(EuiCallOut)).toHaveLength(0);
  });

  it('returns null if there is no matching source data for the service type', () => {
    mockUseParams.mockReturnValue({ serviceType: 'doesnt_exist' });

    const wrapper = shallow(<SourceConfig />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders a breadcrumb fallback while data is loading', () => {
    setMockValues({ dataLoading: true, sourceConfigData: {} });
    const wrapper = shallow(<SourceConfig />);

    expect(wrapper.prop('pageChrome')).toEqual(['Settings', 'Content source connectors', '...']);
  });

  it('handles delete click', () => {
    const wrapper = shallow(<SourceConfig />);
    const saveConfig = wrapper.find(SaveConfig);

    // Trigger modal visibility
    saveConfig.prop('onDeleteConfig')!();

    wrapper.find(EuiConfirmModal).prop('onConfirm')!({} as any);

    expect(deleteSourceConfig).toHaveBeenCalled();
  });

  it('saves source config', () => {
    const wrapper = shallow(<SourceConfig />);
    const saveConfig = wrapper.find(SaveConfig);

    // Trigger modal visibility
    saveConfig.prop('onDeleteConfig')!();

    saveConfig.prop('advanceStep')!();

    expect(saveSourceConfig).toHaveBeenCalled();
  });

  it('cancels and closes modal', () => {
    const wrapper = shallow(<SourceConfig />);
    const saveConfig = wrapper.find(SaveConfig);

    // Trigger modal visibility
    saveConfig.prop('onDeleteConfig')!();

    wrapper.find(EuiConfirmModal).prop('onCancel')!({} as any);

    expect(wrapper.find(EuiConfirmModal)).toHaveLength(0);
  });

  it('shows feedback link for external sources', () => {
    mockUseParams.mockReturnValue({ serviceType: 'external' });
    const wrapper = shallow(<SourceConfig />);
    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });
});
