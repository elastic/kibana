/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiComboBox,
  EuiFieldText,
} from '@elastic/eui';

import { MultiFieldMapping, SelectedFieldMappings } from './multi_field_selector';

const DEFAULT_VALUES = {
  addInferencePipelineModal: {
    configuration: {},
  },
  sourceFields: ['my-source-field1', 'my-source-field2', 'my-source-field3'],
};

describe('MultiFieldMapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });
  it('renders multi field selector with options', () => {
    setMockValues(DEFAULT_VALUES);
    const wrapper = shallow(<MultiFieldMapping />);

    expect(wrapper.find(EuiComboBox)).toHaveLength(1);
    const comboBox = wrapper.find(EuiComboBox);
    expect(comboBox.prop('options')).toEqual([
      {
        label: 'my-source-field1',
      },
      {
        label: 'my-source-field2',
      },
      {
        label: 'my-source-field3',
      },
    ]);
  });
  it('renders multi field selector with options excluding mapped and selected fields', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        configuration: {
          fieldMappings: [
            {
              sourceField: 'my-source-field2',
              targetField: 'my-target-field2',
            },
          ],
        },
        selectedSourceFields: ['my-source-field1'],
      },
    });
    const wrapper = shallow(<MultiFieldMapping />);

    expect(wrapper.find(EuiComboBox)).toHaveLength(1);
    const comboBox = wrapper.find(EuiComboBox);
    expect(comboBox.prop('options')).toEqual([
      {
        label: 'my-source-field3',
      },
    ]);
  });
  it('disables add mapping button if no fields are selected', () => {
    setMockValues(DEFAULT_VALUES);
    const wrapper = shallow(<MultiFieldMapping />);

    expect(wrapper.find(EuiButton)).toHaveLength(1);
    const button = wrapper.find(EuiButton);
    expect(button.prop('disabled')).toBe(true);
  });
  it('enables add mapping button if some fields are selected', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        ...DEFAULT_VALUES.addInferencePipelineModal,
        selectedSourceFields: ['my-source-field1'],
      },
    });
    const wrapper = shallow(<MultiFieldMapping />);

    expect(wrapper.find(EuiButton)).toHaveLength(1);
    const button = wrapper.find(EuiButton);
    expect(button.prop('disabled')).toBe(false);
  });
  it('disables target field text field if no source fields are selected', () => {
    setMockValues(DEFAULT_VALUES);
    const wrapper = shallow(<MultiFieldMapping />);

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
    const textField = wrapper.find(EuiFieldText);
    expect(textField.prop('disabled')).toBe(true);
  });
  it('disables target field text field if multiple source fields are selected', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        ...DEFAULT_VALUES.addInferencePipelineModal,
        selectedSourceFields: ['my-source-field1', 'my-source-field2'],
      },
    });
    const wrapper = shallow(<MultiFieldMapping />);

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
    const textField = wrapper.find(EuiFieldText);
    expect(textField.prop('disabled')).toBe(true);
  });
  it('disables target field text field if text expansion model is selected', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      isTextExpansionModelSelected: true,
    });
    const wrapper = shallow(<MultiFieldMapping />);

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
    const textField = wrapper.find(EuiFieldText);
    expect(textField.prop('disabled')).toBe(true);
  });
  it('enables target field text field if a single source field is selected', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        ...DEFAULT_VALUES.addInferencePipelineModal,
        selectedSourceFields: ['my-source-field1'],
      },
    });
    const wrapper = shallow(<MultiFieldMapping />);

    expect(wrapper.find(EuiFieldText)).toHaveLength(1);
    const textField = wrapper.find(EuiFieldText);
    expect(textField.prop('disabled')).toBe(false);
  });
});

describe('SelectedFieldMappings', () => {
  const mockValues = {
    ...DEFAULT_VALUES,
    addInferencePipelineModal: {
      configuration: {
        fieldMappings: [
          {
            sourceField: 'my-source-field1',
            targetField: 'my-target-field1',
          },
          {
            sourceField: 'my-source-field2',
            targetField: 'my-target-field2',
          },
        ],
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });
  it('renders field mapping list', () => {
    setMockValues(mockValues);
    const wrapper = shallow(<SelectedFieldMappings />);

    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
    const table = wrapper.find(EuiBasicTable);
    expect(table.prop('items')).toEqual(
      mockValues.addInferencePipelineModal.configuration.fieldMappings
    );
  });
  it('does not render action column in read-only mode', () => {
    setMockValues(mockValues);
    const wrapper = shallow(<SelectedFieldMappings isReadOnly />);

    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);
    const table = wrapper.find(EuiBasicTable);
    expect(table.prop('columns').map((c: EuiBasicTableColumn<{}>) => c.name)).toEqual([
      'Source text field',
      '',
      'Target field',
    ]);
  });
});
