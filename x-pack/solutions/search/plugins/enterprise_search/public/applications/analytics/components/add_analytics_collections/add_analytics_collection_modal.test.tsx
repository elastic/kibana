/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiModal } from '@elastic/eui';

import { AddAnalyticsCollectionForm } from './add_analytics_collection_form';

import { AddAnalyticsCollectionModal } from './add_analytics_collection_modal';

const mockValues = {
  canSubmit: true,
  isLoading: false,
  isSuccess: false,
  isSystemError: false,
};

const mockActions = {
  createAnalyticsCollection: jest.fn(),
  setNameValue: jest.fn(),
};

describe('AddAnalyticsCollectionModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<AddAnalyticsCollectionModal onClose={mockOnClose} />);
    expect(wrapper.find(EuiModal)).toHaveLength(1);
    expect(wrapper.find(AddAnalyticsCollectionForm)).toHaveLength(1);
  });

  it('successful creation will call onClose action', () => {
    setMockValues({ ...mockValues, isSuccess: true });
    setMockActions(mockActions);

    shallow(<AddAnalyticsCollectionModal onClose={mockOnClose} />);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('system error will call onClose action', () => {
    setMockValues({ ...mockValues, isSystemError: true });
    setMockActions(mockActions);

    shallow(<AddAnalyticsCollectionModal onClose={mockOnClose} />);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disabled confirmed button when canSubmit is false', () => {
    setMockValues({
      ...mockValues,
      canSubmit: false,
    });
    setMockActions(mockActions);

    const wrapper = shallow(<AddAnalyticsCollectionModal onClose={mockOnClose} />);

    expect(wrapper.find(EuiButton).prop('isDisabled')).toBeTruthy();
  });
});
