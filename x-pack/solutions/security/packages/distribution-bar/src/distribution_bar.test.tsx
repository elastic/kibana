/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { DistributionBar } from '..';

const testSubj = 'distribution-bar';

describe('DistributionBar', () => {
  it('should render', () => {
    const stats = [
      {
        key: 'passed',
        count: 90,
        color: 'green',
      },
      {
        key: 'failed',
        count: 10,
        color: 'red',
      },
    ];

    const { container } = render(<DistributionBar stats={stats} data-test-subj={testSubj} />);
    expect(container).toBeInTheDocument();
    expect(container.querySelectorAll(`[data-test-subj="${testSubj}__part"]`).length).toEqual(
      stats.length
    );
  });

  it('should render empty bar', () => {
    const { container } = render(<DistributionBar data-test-subj={testSubj} stats={[]} />);
    expect(container).toBeInTheDocument();
    expect(container.querySelectorAll(`[data-test-subj="${testSubj}__emptyBar"]`).length).toEqual(
      1
    );
    expect(container.querySelector(`[data-test-subj="${testSubj}__emptyBar"]`)).toBeInTheDocument();
  });

  it('should render pretty names', () => {
    const stats = [
      {
        key: 'low',
        count: 9,
        color: 'green',
      },
      {
        key: 'medium',
        count: 90,
        color: 'red',
      },
      {
        key: 'high',
        count: 900,
        color: 'red',
      },
      {
        key: 'critical',
        count: 9000,
        color: 'red',
      },
      {
        key: 'mega-critical',
        count: 90000,
        color: 'red',
      },
    ];
    const expectedPrettyNames = ['9', '90', '900', '9k', '90k'];

    const { container } = render(<DistributionBar stats={stats} data-test-subj={testSubj} />);
    expect(container).toBeInTheDocument();
    const parts = container.querySelectorAll(`[data-test-subj="${testSubj}__part"]`);
    parts.forEach((part, index) => {
      expect(part.textContent).toContain(expectedPrettyNames[index]);
    });
  });

  it('should render last tooltip by default', () => {
    const stats = [
      {
        key: 'low',
        count: 9,
        color: 'green',
      },
      {
        key: 'medium',
        count: 90,
        color: 'red',
      },
      {
        key: 'high',
        count: 900,
        color: 'red',
      },
    ];

    const { container } = render(
      <DistributionBar stats={stats} data-test-subj={testSubj} hideLastTooltip={true} />
    );
    expect(container).toBeInTheDocument();
    const parts = container.querySelectorAll(`[classname*="distribution_bar--tooltip"]`);
    parts.forEach((part, index) => {
      if (index < parts.length - 1) {
        expect(part).toHaveStyle({ opacity: 0 });
      } else {
        expect(part).toHaveStyle({ opacity: 1 });
      }
    });
  });

  it('should not render last tooltip when hideLastTooltip is true', () => {
    const stats = [
      {
        key: 'low',
        count: 9,
        color: 'green',
      },
      {
        key: 'medium',
        count: 90,
        color: 'red',
      },
      {
        key: 'high',
        count: 900,
        color: 'red',
      },
    ];

    const { container } = render(
      <DistributionBar stats={stats} data-test-subj={testSubj} hideLastTooltip={true} />
    );
    expect(container).toBeInTheDocument();
    const parts = container.querySelectorAll(`[classname*="distribution_bar--tooltip"]`);
    parts.forEach((part) => {
      expect(part).toHaveStyle({ opacity: 0 });
    });
  });

  // todo: test tooltip visibility logic
});
