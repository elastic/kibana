/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButtonEmpty } from '@elastic/eui';

import { DocumentCreationButtons } from '..';

import { ShowCreationModes } from '.';

describe('ShowCreationModes', () => {
  const actions = {
    closeDocumentCreation: jest.fn(),
  };
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    jest.clearAllMocks();
    setMockActions(actions);
    wrapper = shallow(<ShowCreationModes />);
  });

  it('renders', () => {
    expect(wrapper.find('h2').text()).toEqual('Add new documents');
    expect(wrapper.find(DocumentCreationButtons)).toHaveLength(1);
  });

  it('closes the flyout', () => {
    wrapper.find(EuiButtonEmpty).simulate('click');
    expect(actions.closeDocumentCreation).toHaveBeenCalled();
  });
});
