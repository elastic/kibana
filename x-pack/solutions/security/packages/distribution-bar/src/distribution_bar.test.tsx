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

  describe('tooltip overflow edge cases', () => {
    it('should add flipped tooltip attribute for small segments', () => {
      // Mock getBoundingClientRect to simulate small segment that would overflow
      const mockGetBoundingClientRect = jest.fn();

      const containerRect = {
        left: 0,
        right: 500,
        width: 500,
        top: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      const smallPartRect = {
        left: 0,
        right: 50,
        width: 50,
        top: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      const tooltipContentRect = {
        left: 0,
        right: 120,
        width: 120,
        top: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      const largePartRect = {
        left: 250,
        right: 500,
        width: 250,
        top: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      Element.prototype.getBoundingClientRect = mockGetBoundingClientRect
        .mockReturnValueOnce(containerRect)
        .mockReturnValueOnce(smallPartRect)
        .mockReturnValueOnce(tooltipContentRect)
        .mockReturnValueOnce(largePartRect)
        .mockReturnValueOnce(tooltipContentRect);

      const stats = [
        {
          key: 'small',
          count: 1,
          color: 'green',
          label: 'Small',
        },
        {
          key: 'large',
          count: 1000,
          color: 'red',
          label: 'Large',
        },
      ];

      const { container } = render(<DistributionBar stats={stats} data-test-subj={testSubj} />);
      expect(container).toBeInTheDocument();

      const parts = container.querySelectorAll(`[data-test-subj="${testSubj}__part"]`);
      expect(parts.length).toEqual(stats.length);

      expect(parts[0].getAttribute('data-tooltip-flipped')).toBe('true');

      expect(parts[1].getAttribute('data-tooltip-flipped')).toBe('false');

      mockGetBoundingClientRect.mockRestore();
    });

    it('should not flip tooltip when there is enough space', () => {
      const mockGetBoundingClientRect = jest.fn();

      const containerRect = {
        left: 0,
        right: 500,
        width: 500,
        top: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
      const partRect = {
        left: 200,
        right: 500,
        width: 300,
        top: 0,
        bottom: 0,
        x: 200,
        y: 0,
        toJSON: () => ({}),
      };
      const tooltipRect = {
        left: 0,
        right: 120,
        width: 120,
        top: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };

      Element.prototype.getBoundingClientRect = mockGetBoundingClientRect
        .mockReturnValueOnce(containerRect)
        .mockReturnValueOnce(partRect)
        .mockReturnValueOnce(tooltipRect);

      const stats = [
        {
          key: 'medium',
          count: 500,
          color: 'yellow',
          label: 'Medium',
        },
      ];

      const { container } = render(<DistributionBar stats={stats} data-test-subj={testSubj} />);

      const parts = container.querySelectorAll(`[data-test-subj="${testSubj}__part"]`);
      expect(parts[0].getAttribute('data-tooltip-flipped')).toBe('false');

      mockGetBoundingClientRect.mockRestore();
    });
  });
});
