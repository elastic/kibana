/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';

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
  test('renders correctly against snapshot', () => {
    const { container } = render(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );
    expect(container.children[0]).toMatchSnapshot();
  });

  test('it renders the the ip address', () => {
    render(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(screen.getByTestId('network-details')).toHaveTextContent('10.1.2.3');
  });

  test('it displays a button which opens the network/ip side panel', () => {
    render(
      <TestProviders>
        <Ip contextId="test" eventId="abcd" fieldName="destination.ip" value="10.1.2.3" />
      </TestProviders>
    );

    expect(screen.getByTestId('network-details')).toHaveAttribute(
      'href',
      '/ip/10.1.2.3/source/events'
    );
  });
});
