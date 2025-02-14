/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { matchers } from '@emotion/jest';

expect.extend(matchers);

import { TestProviders } from '../../mock';
import { getHeaderAlignment, HeaderSection } from '.';
import { ModalInspectQuery } from '../inspect/modal';
import { renderHook } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';

jest.mock('../inspect/modal', () => {
  const actual = jest.requireActual('../inspect/modal');
  return {
    ...actual,
    ModalInspectQuery: jest.fn().mockReturnValue(null),
  };
});

jest.mock('../inspect/use_inspect', () => ({
  useInspect: () => ({
    isShowingModal: true,
    handleClick: jest.fn(),
    request: 'fake request',
    response: 'fake response',
  }),
}));

describe('HeaderSection', () => {
  beforeEach(() => jest.clearAllMocks());

  test('it renders', () => {
    const wrapper = shallow(<HeaderSection title="Test title" />);

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the title', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-title"]').first().exists()).toBe(true);
  });

  test('it renders the subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection subtitle="Test subtitle" title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').first().exists()).toBe(true);
  });

  test('renders the subtitle when not provided (to prevent layout thrash)', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').first().exists()).toBe(true);
  });

  test('it renders the tooltip when provided', () => {
    const tooltipContent = 'test tooltip content';
    const tooltipTitle = 'test tooltip title';

    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" tooltip={tooltipContent} tooltipTitle={tooltipTitle} />
      </TestProviders>
    );

    expect(wrapper.find('EuiIconTip').exists()).toBe(true);
    expect(wrapper.find('EuiIconTip').prop('content')).toBe(tooltipContent);
    expect(wrapper.find('EuiIconTip').prop('title')).toBe(tooltipTitle);
  });

  test('it renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-supplements"]').first().exists()).toBe(
      true
    );
  });

  test('it DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-supplements"]').first().exists()).toBe(
      false
    );
  });

  test('it applies border styles when border is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection border title="Test title" />
      </TestProviders>
    );
    const siemHeaderSection = wrapper.find('.siemHeaderSection').first();

    expect(siemHeaderSection.exists()).toBe(true);

    const { result } = renderHook(() => useEuiTheme());

    expect(siemHeaderSection).toHaveStyleRule('border-bottom', result.current.euiTheme.border.thin);
    expect(siemHeaderSection).toHaveStyleRule('padding-bottom', result.current.euiTheme.size.l);
  });

  test('it DOES NOT apply border styles when border is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );
    const siemHeaderSection = wrapper.find('.siemHeaderSection').first();

    const { result } = renderHook(() => useEuiTheme());

    expect(siemHeaderSection).not.toHaveStyleRule(
      'border-bottom',
      result.current.euiTheme.border.thin
    );
    expect(siemHeaderSection).not.toHaveStyleRule('padding-bottom', result.current.euiTheme.size.l);
  });

  test('it splits the title and supplement areas evenly when split is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection split title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiFlexItem[data-test-subj="header-section-supplements"]')
        .last()
        .prop('className')
    ).not.toContain('growZero');
  });

  test('it DOES NOT split the title and supplement areas evenly when split is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiFlexItem[data-test-subj="header-section-supplements"]')
        .last()
        .prop('className')
    ).toContain('growZero');
  });

  test('it renders an inspect button when an `id` is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(true);
  });

  test('it renders an inspect button when an `id` is provided and `showInspectButton` is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title" showInspectButton={true}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(true);
  });

  test('it does NOT render an inspect button when `showInspectButton` is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title" showInspectButton={false}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(false);
  });

  test('it does NOT render an inspect button when an `id` is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(false);
  });

  test('it defaults to using `title` for the inspect modal when `inspectTitle` is NOT provided', () => {
    const title = 'Use this by default';

    mount(
      <TestProviders>
        <HeaderSection id="abcd" title={title}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect((ModalInspectQuery as jest.Mock).mock.calls[0][0].title).toEqual(title);
  });

  test('it uses `inspectTitle` instead of `title` for the inspect modal when `inspectTitle` is provided', () => {
    const title = `Don't use this`;
    const inspectTitle = 'Use this instead';

    mount(
      <TestProviders>
        <HeaderSection id="abcd" inspectTitle={inspectTitle} title={title}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect((ModalInspectQuery as jest.Mock).mock.calls[0][0].title).toEqual(inspectTitle);
  });

  test('it does not render query-toggle-header when no arguments provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="query-toggle-header"]').first().exists()).toBe(false);
  });

  test('it does render query-toggle-header when toggleQuery arguments provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title" toggleQuery={jest.fn()} toggleStatus={true}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="query-toggle-header"]').first().exists()).toBe(true);
  });

  test('it does NOT align items to flex start in the outer flex group when stackHeader is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" stackHeader={true} title="Test title" toggleQuery={jest.fn()}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="headerSectionOuterFlexGroup"]').last().getDOMNode().className
    ).not.toContain('flexStart-flexStart');
  });

  test(`it uses the 'column' direction in the outer flex group by default`, () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title" toggleQuery={jest.fn()}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="headerSectionOuterFlexGroup"]').last().getDOMNode().className
    ).toContain('column');
  });

  test('it uses the `outerDirection` prop to specify the direction of the outer flex group when it is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" outerDirection="row" title="Test title" toggleQuery={jest.fn()}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="headerSectionOuterFlexGroup"]').last().getDOMNode().className
    ).toContain('row');
  });

  test('it defaults to center alignment in the inner flex group', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title" toggleQuery={jest.fn()}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="headerSectionInnerFlexGroup"]').last().getDOMNode().className
    ).toContain('center');
  });

  test('it aligns items using the value of the `alignHeader` prop in the inner flex group when specified', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection alignHeader="flexEnd" id="an id" title="Test title" toggleQuery={jest.fn()}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="headerSectionInnerFlexGroup"]').last().getDOMNode().className
    ).toContain('flexEnd');
  });

  test('it does NOT default to center alignment in the inner flex group when the `stackHeader` prop is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" stackHeader={true} title="Test title" toggleQuery={jest.fn()}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="headerSectionInnerFlexGroup"]').last().getDOMNode().className
    ).not.toContain('center');
  });

  test('it does render everything but title when toggleStatus = true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection
          id="an id"
          title="Test title"
          subtitle="subtitle"
          headerFilters="headerFilters"
          toggleQuery={jest.fn()}
          toggleStatus={true}
        >
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="query-toggle-header"]').first().prop('iconType')).toBe(
      'arrowDown'
    );
    expect(wrapper.find('[data-test-subj="header-section-supplements"]').first().exists()).toBe(
      true
    );
    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').first().exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="header-section-filters"]').first().exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(true);
  });

  test('it appends `toggle-expand` class to Header when toggleStatus = true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection
          id="an id"
          title="Test title"
          subtitle="subtitle"
          headerFilters="headerFilters"
          toggleQuery={jest.fn()}
          toggleStatus={true}
        >
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section"]').first().prop('className')).toBe(
      'toggle-expand siemHeaderSection'
    );
  });

  test('it does not render anything but title when toggleStatus = false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection
          id="an id"
          title="Test title"
          subtitle="subtitle"
          headerFilters="headerFilters"
          toggleQuery={jest.fn()}
          toggleStatus={false}
        >
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="query-toggle-header"]').first().prop('iconType')).toBe(
      'arrowRight'
    );
    expect(wrapper.find('[data-test-subj="header-section-supplements"]').first().exists()).toBe(
      false
    );
    expect(wrapper.find('[data-test-subj="header-section-filters"]').first().exists()).toBe(false);
    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').first().exists()).toBe(false);
    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(false);
  });

  test('it toggles query when icon is clicked', () => {
    const mockToggle = jest.fn();
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title" toggleQuery={mockToggle} toggleStatus={true}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );
    wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
    expect(mockToggle).toBeCalledWith(false);
  });

  describe('getHeaderAlignment', () => {
    test(`it always returns the value of alignHeader when it's provided`, () => {
      const alignHeader = 'flexStart';
      const stackHeader = true;

      expect(getHeaderAlignment({ alignHeader, stackHeader })).toEqual(alignHeader);
    });

    test(`it returns undefined when stackHeader is true`, () => {
      const stackHeader = true;

      expect(getHeaderAlignment({ stackHeader })).toBeUndefined();
    });

    test(`it returns 'center' when stackHeader is false`, () => {
      const stackHeader = false;

      expect(getHeaderAlignment({ stackHeader })).toEqual('center');
    });

    test(`it returns 'center' by default`, () => {
      expect(getHeaderAlignment({})).toEqual('center');
    });
  });
});
