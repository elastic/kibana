/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { SpacerWithoutMarginCollapse } from '.';
import { TestProviders } from '../../../../../common/mock';

describe('SpacerWithoutMarginCollapse', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <TestProviders>
        <SpacerWithoutMarginCollapse size="l" />
      </TestProviders>
    );

    expect(container).toBeInTheDocument();
  });

  it('applies flow-root display style to container', () => {
    const { container } = render(
      <TestProviders>
        <SpacerWithoutMarginCollapse size="l" />
      </TestProviders>
    );

    const wrapper = container.firstChild as HTMLElement;
    const computedStyle = window.getComputedStyle(wrapper);

    expect(computedStyle.display).toBe('flow-root');
  });

  it('renders with custom data-test-subj', () => {
    const { container } = render(
      <TestProviders>
        <SpacerWithoutMarginCollapse data-test-subj="customSpacer" size="m" />
      </TestProviders>
    );

    const wrapper = container.querySelector('[data-test-subj="customSpacer"]');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const sizes: Array<'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'> = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

    sizes.forEach((size) => {
      const { container } = render(
        <TestProviders>
          <SpacerWithoutMarginCollapse size={size} />
        </TestProviders>
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('contains an EuiSpacer', () => {
    const { container } = render(
      <TestProviders>
        <SpacerWithoutMarginCollapse size="l" />
      </TestProviders>
    );

    // EuiSpacer renders as a div with specific class
    const spacer = container.querySelector('.euiSpacer');
    expect(spacer).toBeInTheDocument();
  });
});
