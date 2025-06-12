/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';
import { connectorIndex } from '../../../../__mocks__/view_index.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiButton } from '@elastic/eui';

import { LicensingCallout } from '../../../../../shared/licensing_callout/licensing_callout';

import { CopyAndCustomizePipelinePanel } from './customize_pipeline_item';

const DEFAULT_VALUES = {
  // LicensingLogic
  hasPlatinumLicense: true,
  // IndexViewLogic
  indexName: connectorIndex.name,
  ingestionMethod: 'connector',
  // KibanaLogic
  isCloud: false,
  // PipelineLogic
  hasIndexIngestionPipeline: false,
};

describe('CopyAndCustomizePipelinePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...DEFAULT_VALUES });
  });
  it('renders callout with default pipeline', () => {
    const wrapper = shallow(<CopyAndCustomizePipelinePanel />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
    expect(wrapper.find(EuiButton).render().text()).toBe('Copy and customize');
  });
  it('returns LicensingCallout if gated', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasPlatinumLicense: false,
      isCloud: false,
    });

    const wrapper = shallow(<CopyAndCustomizePipelinePanel />);
    expect(wrapper.find(LicensingCallout)).toHaveLength(1);
  });
  it('returns null if you have a custom pipeline', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasIndexIngestionPipeline: true,
    });

    const wrapper = shallow(<CopyAndCustomizePipelinePanel />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
