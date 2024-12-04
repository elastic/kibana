/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SecuritySolutionPageWrapper } from '.';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { TestProviders } from '../../mock';

jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

describe('SecuritySolutionPageWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  it('should render children and apply classNames correctly', () => {
    const { container } = render(
      <SecuritySolutionPageWrapper
        className="custom-class"
        style={{ color: 'red' }}
        noPadding
        noTimeline
      >
        <div>{'Child Component'}</div>
      </SecuritySolutionPageWrapper>,
      {
        wrapper: TestProviders,
      }
    );

    const wrapperElement = container.firstChild;

    expect(wrapperElement).toHaveClass('securitySolutionWrapper');
    expect(wrapperElement).toHaveClass('securitySolutionWrapper--noPadding');
    expect(wrapperElement).not.toHaveClass('securitySolutionWrapper--withTimeline');
    expect(wrapperElement).not.toHaveClass('securitySolutionWrapper--fullHeight');
    expect(wrapperElement).toHaveClass('custom-class');
    expect(wrapperElement).toHaveStyle('color: red');

    expect(wrapperElement).toContainHTML('<div>Child Component</div>');
  });

  it('should apply "noPadding" class when "noPadding" prop is true', () => {
    const { container } = render(
      <SecuritySolutionPageWrapper noPadding>
        <div>{'Child Component'}</div>
      </SecuritySolutionPageWrapper>,
      {
        wrapper: TestProviders,
      }
    );

    const wrapperElement = container.firstChild;

    expect(wrapperElement).toHaveClass('securitySolutionWrapper');
    expect(wrapperElement).toHaveClass('securitySolutionWrapper--noPadding');
    expect(wrapperElement).toHaveClass('securitySolutionWrapper--withTimeline');
    expect(wrapperElement).not.toHaveClass('securitySolutionWrapper--fullHeight');
  });

  it('should apply "noTimeline" class when "noTimeline" prop is true', () => {
    const { container } = render(
      <SecuritySolutionPageWrapper noTimeline>
        <div>{'Child Component'}</div>
      </SecuritySolutionPageWrapper>,
      {
        wrapper: TestProviders,
      }
    );

    const wrapperElement = container.firstChild;

    expect(wrapperElement).toHaveClass('securitySolutionWrapper');
    expect(wrapperElement).not.toHaveClass('securitySolutionWrapper--noPadding');
    expect(wrapperElement).not.toHaveClass('securitySolutionWrapper--withTimeline');
    expect(wrapperElement).not.toHaveClass('securitySolutionWrapper--fullHeight');
  });

  it('should not apply "noTimeline" class when "noTimeline" prop is false', () => {
    const { container } = render(
      <SecuritySolutionPageWrapper noTimeline={false}>
        <div>{'Child Component'}</div>
      </SecuritySolutionPageWrapper>,
      {
        wrapper: TestProviders,
      }
    );

    const wrapperElement = container.firstChild;

    expect(wrapperElement).toHaveClass('securitySolutionWrapper');
    expect(wrapperElement).not.toHaveClass('securitySolutionWrapper--noPadding');
    expect(wrapperElement).toHaveClass('securitySolutionWrapper--withTimeline');
    expect(wrapperElement).not.toHaveClass('securitySolutionWrapper--fullHeight');
  });
});
