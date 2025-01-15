/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiIcon } from '@elastic/eui';

import { rerender } from '../../test_helpers';

import { CloudSetupInstructions } from './cloud/instructions';
import { SetupInstructions } from './instructions';

import { SetupGuideLayout } from '.';

describe('SetupGuideLayout', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    setMockValues({ isCloudEnabled: false });
    wrapper = shallow(
      <SetupGuideLayout productName="Enterprise Search" productEuiIcon="logoEnterpriseSearch">
        <p data-test-subj="test">Wow!</p>
      </SetupGuideLayout>
    );
  });

  it('renders', () => {
    expect(wrapper.find('h1').text()).toEqual('Enterprise Search');
    expect(wrapper.find(EuiIcon).prop('type')).toEqual('logoEnterpriseSearch');
    expect(wrapper.find('[data-test-subj="test"]').text()).toEqual('Wow!');
  });

  it('renders with default self-managed instructions', () => {
    expect(wrapper.find(SetupInstructions)).toHaveLength(1);
    expect(wrapper.find(CloudSetupInstructions)).toHaveLength(0);
  });

  it('renders with cloud instructions', () => {
    setMockValues({ cloud: { isCloudEnabled: true } });
    rerender(wrapper);

    expect(wrapper.find(SetupInstructions)).toHaveLength(0);
    expect(wrapper.find(CloudSetupInstructions)).toHaveLength(1);
  });
});
