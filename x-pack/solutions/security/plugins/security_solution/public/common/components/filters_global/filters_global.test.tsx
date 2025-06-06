/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactWrapper } from 'enzyme';
import { mount, shallow } from 'enzyme';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { FiltersGlobal } from './filters_global';
import { TestProviders } from '../../mock/test_providers';

describe('rendering', () => {
  test('renders correctly', () => {
    const wrapper = shallow(
      <FiltersGlobal>
        <p>{'Additional filters here.'}</p>
      </FiltersGlobal>
    );

    expect(wrapper).toMatchSnapshot();
  });

  describe('when show is true (the default)', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <TestProviders>
          <FiltersGlobal>
            <p>{'Filter content'}</p>
          </FiltersGlobal>
        </TestProviders>
      );
    });

    test('it does NOT render the container with a `display: none` style when `show` is true (the default)', () => {
      expect(
        wrapper.find('[data-test-subj="filters-global-container"]').first()
      ).not.toHaveStyleRule('display', 'none');
    });
  });
});
