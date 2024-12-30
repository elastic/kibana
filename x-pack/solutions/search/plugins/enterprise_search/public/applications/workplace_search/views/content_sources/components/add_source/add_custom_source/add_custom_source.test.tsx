/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../../__mocks__/shallow_useeffect.mock';
import { setMockValues } from '../../../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../../../__mocks__/react_router';
import { sourceConfigData } from '../../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../../components/layout';

import { AddCustomSource } from './add_custom_source';
import { AddCustomSourceSteps } from './add_custom_source_logic';
import { ConfigureCustom } from './configure_custom';
import { SaveCustom } from './save_custom';

describe('AddCustomSource', () => {
  const values = {
    sourceConfigData,
    isOrganization: true,
  };

  beforeEach(() => {
    setMockValues({ ...values });
    mockUseParams.mockReturnValue({ baseServiceType: 'share_point_server' });
  });

  it('renders', () => {
    const wrapper = shallow(<AddCustomSource />);

    expect(wrapper.find(WorkplaceSearchPageTemplate)).toHaveLength(1);
  });

  it('returns null if there is no matching source data for the service type', () => {
    mockUseParams.mockReturnValue({ baseServiceType: 'doesnt_exist' });

    const wrapper = shallow(<AddCustomSource />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('should show correct layout for personal dashboard', () => {
    setMockValues({ isOrganization: false });
    const wrapper = shallow(<AddCustomSource />);

    expect(wrapper.find(WorkplaceSearchPageTemplate)).toHaveLength(0);
    expect(wrapper.find(PersonalDashboardLayout)).toHaveLength(1);
  });

  it('should show Configure Custom for custom configuration step', () => {
    setMockValues({ currentStep: AddCustomSourceSteps.ConfigureCustomStep });
    const wrapper = shallow(<AddCustomSource />);

    expect(wrapper.find(ConfigureCustom)).toHaveLength(1);
  });

  it('should show Save Custom for save custom step', () => {
    setMockValues({ currentStep: AddCustomSourceSteps.SaveCustomStep });
    const wrapper = shallow(<AddCustomSource />);

    expect(wrapper.find(SaveCustom)).toHaveLength(1);
  });
});
