/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiTextArea, EuiButtonEmpty, EuiButton } from '@elastic/eui';

import { rerender } from '../../../../test_helpers';

import { PasteJsonTextTabContent, PasteJsonTextFooterContent } from './paste_json_text';

describe('PasteJsonText', () => {
  const values = {
    textInput: 'hello world',
    isUploading: false,
    errors: [],
    configuredLimits: {
      engine: {
        maxDocumentByteSize: 102400,
      },
    },
  };
  const actions = {
    setTextInput: jest.fn(),
    onSubmitJson: jest.fn(),
    closeDocumentCreation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  describe('PasteJsonTextTabContent', () => {
    it('renders and updates the textarea value', () => {
      setMockValues({ ...values, textInput: 'lorem ipsum' });
      const wrapper = shallow(<PasteJsonTextTabContent />);
      const textarea = wrapper.find(EuiTextArea);

      expect(textarea.prop('value')).toEqual('lorem ipsum');

      textarea.simulate('change', { target: { value: 'dolor sit amet' } });
      expect(actions.setTextInput).toHaveBeenCalledWith('dolor sit amet');
    });
  });

  describe('PasteJsonTextFooterContent', () => {
    it('closes the modal', () => {
      const wrapper = shallow(<PasteJsonTextFooterContent />);

      wrapper.find(EuiButtonEmpty).simulate('click');
      expect(actions.closeDocumentCreation).toHaveBeenCalled();
    });

    it('submits json', () => {
      const wrapper = shallow(<PasteJsonTextFooterContent />);

      wrapper.find(EuiButton).simulate('click');
      expect(actions.onSubmitJson).toHaveBeenCalled();
    });

    it('disables/enables the Continue button based on whether text has been entered', () => {
      const wrapper = shallow(<PasteJsonTextFooterContent />);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(false);

      setMockValues({ ...values, textInput: '' });
      rerender(wrapper);
      expect(wrapper.find(EuiButton).prop('isDisabled')).toBe(true);
    });

    it('sets isLoading based on isUploading', () => {
      const wrapper = shallow(<PasteJsonTextFooterContent />);
      expect(wrapper.find(EuiButton).prop('isLoading')).toBe(false);

      setMockValues({ ...values, isUploading: true });
      rerender(wrapper);
      expect(wrapper.find(EuiButton).prop('isLoading')).toBe(true);
    });
  });
});
