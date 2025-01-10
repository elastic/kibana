/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPanel, EuiLink } from '@elastic/eui';

import { DocumentPermissionsCallout } from './document_permissions_callout';

describe('DocumentPermissionsCallout', () => {
  it('renders', () => {
    const wrapper = shallow(<DocumentPermissionsCallout />);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(EuiLink)).toHaveLength(1);
  });
});
