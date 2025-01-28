/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from 'enzyme';
import React from 'react';

import { EmbeddedMap } from './embedded_map';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

describe('Embedded Map', () => {
  test('it renders', () => {
    const [core] = mockCore();

    const wrapper = render(
      <KibanaContextProvider services={{ ...core }}>
        <EmbeddedMap />
      </KibanaContextProvider>
    );

    expect(wrapper).toMatchSnapshot();
  });
});

const mockMapsStartService = {
  Map: jest.fn().mockImplementation(() => <div data-test-subj="mockMap" />),
};

const mockCore: () => any[] = () => {
  const core = {
    maps: mockMapsStartService,
  };

  return [core];
};
