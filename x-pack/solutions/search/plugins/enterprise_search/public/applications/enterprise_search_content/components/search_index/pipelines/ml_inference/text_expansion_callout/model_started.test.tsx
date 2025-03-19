/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiText } from '@elastic/eui';

import { ModelStarted } from './model_started';
import { TextExpansionDismissButton, FineTuneModelsButton } from './text_expansion_callout';

const DEFAULT_VALUES = {
  startTextExpansionModelError: undefined,
  isCreateButtonDisabled: false,
  isModelDownloadInProgress: false,
  isModelDownloaded: false,
  isModelStarted: false,
  isStartButtonDisabled: false,
};

describe('ModelStarted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
  });
  it('renders dismiss button if it is set to dismissable', () => {
    const wrapper = shallow(
      <ModelStarted dismiss={() => {}} isCompact={false} isDismissable isSingleThreaded />
    );
    expect(wrapper.find(TextExpansionDismissButton).length).toBe(1);
  });
  it('does not render dismiss button if it is set to non-dismissable', () => {
    const wrapper = shallow(
      <ModelStarted dismiss={() => {}} isCompact={false} isDismissable={false} isSingleThreaded />
    );
    expect(wrapper.find(TextExpansionDismissButton).length).toBe(0);
  });
  it('renders fine-tune button if the model is running single-threaded', () => {
    const wrapper = shallow(
      <ModelStarted dismiss={() => {}} isCompact={false} isDismissable isSingleThreaded />
    );
    expect(wrapper.find(FineTuneModelsButton).length).toBe(1);
  });
  it('does not render description if it is set to compact', () => {
    const wrapper = shallow(
      <ModelStarted dismiss={() => {}} isCompact isDismissable isSingleThreaded />
    );
    expect(wrapper.find(EuiText).length).toBe(1); // Title only
  });
});
