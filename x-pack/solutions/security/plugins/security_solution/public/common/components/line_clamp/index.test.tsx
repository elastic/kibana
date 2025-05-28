/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { repeat } from 'lodash/fp';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';

import { LineClamp } from '.';

describe('LineClamp', () => {
  const message = repeat(1000, 'abcdefghij '); // 10 characters, with a trailing space

  describe('no overflow', () => {
    test('it does NOT render the expanded line clamp when isOverflow is falsy', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      expect(wrapper.find('[data-test-subj="expanded-line-clamp"]').exists()).toBe(false);
    });

    test('it does NOT render the styled line clamp expanded when isOverflow is falsy', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      expect(wrapper.find('[data-test-subj="styled-line-clamp"]').exists()).toBe(false);
    });

    test('it renders the children when isOverflow is falsy', () => {
      const TestComponent = () => <>{message}</>;
      const wrapper = mount(
        <LineClamp>
          <TestComponent />
        </LineClamp>
      );

      expect(wrapper.childAt(0).type()).toBe(TestComponent);
    });

    test('it does NOT render the `Read More` button when isOverflow is falsy', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      expect(wrapper.find('[data-test-subj="summary-view-readmore"]').exists()).toBe(false);
    });
  });

  describe('overflow', () => {
    const clientHeight = 400;
    const scrollHeight = clientHeight + 100; // scrollHeight is > clientHeight
    let spyClientHeight: jest.SpyInstance<number, []>;
    let spyScrollHeight: jest.SpyInstance<number, []>;

    beforeAll(() => {
      spyClientHeight = jest.spyOn(window.HTMLElement.prototype, 'clientHeight', 'get');
      spyClientHeight.mockReturnValue(clientHeight);
      spyScrollHeight = jest.spyOn(window.HTMLElement.prototype, 'scrollHeight', 'get');
      spyScrollHeight.mockReturnValue(scrollHeight);
    });

    afterAll(() => {
      spyClientHeight.mockRestore();
      spyScrollHeight.mockRestore();
    });

    test('it does NOT render the expanded line clamp by default when isOverflow is true', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      expect(wrapper.find('[data-test-subj="expanded-line-clamp"]').exists()).toBe(false);
    });

    test('it renders the styled line clamp when isOverflow is true', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      expect(wrapper.find('[data-test-subj="styled-line-clamp"]').first().text()).toBe(message);
    });

    test('it does NOT render the default line clamp when isOverflow is true', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      expect(wrapper.find('[data-test-subj="default-line-clamp"]').exists()).toBe(false);
    });

    test('it renders the `Read More` button with the expected (default) text when isOverflow is true', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      expect(wrapper.find('[data-test-subj="summary-view-readmore"]').first().text()).toBe(
        'Read More'
      );
    });

    describe('clicking the Read More button', () => {
      test('it displays the `Read Less` button text after the user clicks the `Read More` button when isOverflow is true', () => {
        const wrapper = mount(<LineClamp>{message}</LineClamp>);

        wrapper.find('[data-test-subj="summary-view-readmore"]').first().simulate('click');
        wrapper.update();

        expect(wrapper.find('[data-test-subj="summary-view-readmore"]').first().text()).toBe(
          'Read Less'
        );
      });

      test('it renders the expanded content after the user clicks the `Read More` button when isOverflow is true', () => {
        const wrapper = mount(<LineClamp>{message}</LineClamp>);

        wrapper.find('[data-test-subj="summary-view-readmore"]').first().simulate('click');
        wrapper.update();

        expect(wrapper.find('[data-test-subj="expanded-line-clamp"]').first().text()).toBe(message);
      });
    });

    test('it renders the expanded content with a max-height of one third the view height when isOverflow is true', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      wrapper.find('[data-test-subj="summary-view-readmore"]').first().simulate('click');
      wrapper.update();

      expect(wrapper.find('[data-test-subj="expanded-line-clamp"]').first()).toHaveStyleRule(
        'max-height',
        '33vh'
      );
    });

    test('it automatically vertically scrolls the content when isOverflow is true', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      wrapper.find('[data-test-subj="summary-view-readmore"]').first().simulate('click');
      wrapper.update();

      expect(wrapper.find('[data-test-subj="expanded-line-clamp"]').first()).toHaveStyleRule(
        'overflow-y',
        'auto'
      );
    });

    test('it does NOT render the styled line clamp after the user clicks the `Read More` button when isOverflow is true', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      wrapper.find('[data-test-subj="summary-view-readmore"]').first().simulate('click');
      wrapper.update();

      expect(wrapper.find('[data-test-subj="styled-line-clamp"]').exists()).toBe(false);
    });

    test('it does NOT render the default line clamp after the user clicks the `Read More` button when isOverflow is true', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      wrapper.find('[data-test-subj="summary-view-readmore"]').first().simulate('click');
      wrapper.update();

      expect(wrapper.find('[data-test-subj="default-line-clamp"]').exists()).toBe(false);
    });

    test('it once again displays the `Read More` button text after the user clicks the `Read Less` when isOverflow is true', () => {
      const wrapper = mount(<LineClamp>{message}</LineClamp>);

      wrapper.find('[data-test-subj="summary-view-readmore"]').first().simulate('click');
      wrapper.update(); // 1st toggle

      wrapper.find('[data-test-subj="summary-view-readmore"]').first().simulate('click');
      wrapper.update(); // 2nd toggle

      expect(wrapper.find('[data-test-subj="summary-view-readmore"]').first().text()).toBe(
        'Read More' // after the 2nd toggle, the button once-again says `Read More`
      );
    });
  });
});
