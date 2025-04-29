/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { AutocompleteFieldExistsComponent } from '.';

describe('AutocompleteFieldExistsComponent', () => {
  test('it renders field disabled', () => {
    const wrapper = mount(<AutocompleteFieldExistsComponent placeholder="Placeholder text" />);

    expect(
      wrapper
        .find(`[data-test-subj="valuesAutocompleteComboBox existsComboxBox"] input`)
        .prop('disabled')
    ).toBeTruthy();
  });
});
