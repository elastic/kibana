/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';

import { Ip } from '.';

jest.mock('../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../common/components/links/link_props');

describe('Port', () => {
  const mount = useMountAppended();

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the the ip address', () => {
    const wrapper = mount(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="formatted-ip"]').first().text()).toEqual('10.1.2.3');
  });

  test('it displays a button which opens the network/ip side panel', () => {
    const wrapper = mount(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="network-details"]').find('a').first().text()).toEqual(
      '10.1.2.3'
    );
  });
});
