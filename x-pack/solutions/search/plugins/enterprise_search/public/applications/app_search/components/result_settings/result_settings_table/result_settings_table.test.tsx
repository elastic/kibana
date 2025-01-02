/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { DisabledFieldsHeader } from './disabled_fields_header';
import { NonTextFieldsBody } from './non_text_fields_body';
import { ResultSettingsTable } from './result_settings_table';
import { TextFieldsBody } from './text_fields_body';

describe('ResultSettingsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({
      textResultFields: { foo: { raw: true, rawSize: 5, snippet: false, snippetFallback: false } },
      nonTextResultFields: {
        bar: { raw: true, rawSize: 5, snippet: false, snippetFallback: false },
      },
      schemaConflicts: {
        foo: {
          text: ['foo'],
          number: ['foo'],
          geolocation: [],
          date: [],
        },
      },
    });
  });

  it('renders', () => {
    const wrapper = shallow(<ResultSettingsTable />);
    expect(wrapper.find(TextFieldsBody).exists()).toBe(true);
    expect(wrapper.find(NonTextFieldsBody).exists()).toBe(true);
    expect(wrapper.find(DisabledFieldsHeader).exists()).toBe(true);
  });

  it('will hide sections that have no data available to show', () => {
    setMockValues({
      textResultFields: {},
      nonTextResultFields: {},
      schemaConflicts: {},
    });

    const wrapper = shallow(<ResultSettingsTable />);
    expect(wrapper.find(TextFieldsBody).exists()).toBe(false);
    expect(wrapper.find(NonTextFieldsBody).exists()).toBe(false);
    expect(wrapper.find(DisabledFieldsHeader).exists()).toBe(false);
  });
});
