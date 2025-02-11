/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { ModelDeployed } from './model_deployed';
import { TextExpansionDismissButton } from './text_expansion_callout';

const DEFAULT_VALUES = {
  startTextExpansionModelError: undefined,
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
  isModelStarted: false,
  isStartButtonDisabled: false,
};

describe('ModelDeployed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
  });
  it('renders start button', () => {
    const wrapper = shallow(
      <ModelDeployed
        dismiss={() => {}}
        ingestionMethod="crawler"
        isDismissable={false}
        isStartButtonDisabled={false}
      />
    );
    expect(wrapper.find(EuiButton).length).toBe(1);
    const button = wrapper.find(EuiButton);
    expect(button.prop('disabled')).toBe(false);
  });
  it('renders disabled start button if it is set to disabled', () => {
    const wrapper = shallow(
      <ModelDeployed
        dismiss={() => {}}
        ingestionMethod="crawler"
        isDismissable={false}
        isStartButtonDisabled
      />
    );
    expect(wrapper.find(EuiButton).length).toBe(1);
    const button = wrapper.find(EuiButton);
    expect(button.prop('disabled')).toBe(true);
  });
  it('renders dismiss button if it is set to dismissable', () => {
    const wrapper = shallow(
      <ModelDeployed
        dismiss={() => {}}
        ingestionMethod="crawler"
        isDismissable
        isStartButtonDisabled={false}
      />
    );
    expect(wrapper.find(TextExpansionDismissButton).length).toBe(1);
  });
  it('does not render dismiss button if it is set to non-dismissable', () => {
    const wrapper = shallow(
      <ModelDeployed
        dismiss={() => {}}
        ingestionMethod="crawler"
        isDismissable={false}
        isStartButtonDisabled={false}
      />
    );
    expect(wrapper.find(TextExpansionDismissButton).length).toBe(0);
  });
});
