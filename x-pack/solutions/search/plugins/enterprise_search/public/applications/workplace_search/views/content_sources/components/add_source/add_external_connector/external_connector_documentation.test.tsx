/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiText } from '@elastic/eui';

import { ExternalConnectorDocumentation } from './external_connector_documentation';

describe('ExternalDocumentation', () => {
  it('renders', () => {
    const wrapper = shallow(
      <ExternalConnectorDocumentation name="name" documentationUrl="https://url" />
    );

    expect(wrapper.find(EuiText)).toHaveLength(1);
  });
});
