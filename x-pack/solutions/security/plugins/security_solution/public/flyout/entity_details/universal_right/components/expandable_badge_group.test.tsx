/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpandableBadgeGroup } from './expandable_badge_group';

const badgeProps = [
  { color: 'hollow', children: 'Badge 1' },
  { color: 'hollow', children: 'Badge 2' },
  { color: 'hollow', children: 'Badge 3' },
  { color: 'hollow', children: 'Badge 4' },
];

const badgePropsWithElement = [
  { color: 'hollow', children: <span>{'Badge 1 with element'}</span> },
  { color: 'hollow', children: <span>{'Badge 2 with element'}</span> },
  { color: 'hollow', children: <span>{'Badge 3 with element'}</span> },
  { color: 'hollow', children: <span>{'Badge 4 with element'}</span> },
];

describe('ExpandableBadgeGroup', () => {
  it('renders all badges when initialBadgeLimit is not set', () => {
    render(<ExpandableBadgeGroup badges={badgeProps} />);
    badgeProps.forEach((badge) => {
      expect(screen.getByText(badge.children)).toBeInTheDocument();
    });
  });

  it('renders limited badges and expand button when initialBadgeLimit is set', () => {
    render(<ExpandableBadgeGroup badges={badgeProps} initialBadgeLimit={2} />);
    expect(screen.getByText('Badge 1')).toBeInTheDocument();
    expect(screen.getByText('Badge 2')).toBeInTheDocument();
    expect(screen.queryByText('Badge 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Badge 4')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('expands to show all badges when expand button is clicked', () => {
    render(<ExpandableBadgeGroup badges={badgeProps} initialBadgeLimit={2} />);
    fireEvent.click(screen.getByText('+2'));
    badgeProps.forEach((badge) => {
      expect(screen.getByText(badge.children)).toBeInTheDocument();
    });
  });

  it('applies maxHeight style when maxHeight is set', () => {
    const { container } = render(<ExpandableBadgeGroup badges={badgeProps} maxHeight={100} />);
    expect(container.firstChild).toHaveStyle('max-height: 100px');
  });

  it('renders badges with children as React elements', () => {
    render(<ExpandableBadgeGroup badges={badgePropsWithElement} />);
    badgePropsWithElement.forEach((badge) => {
      expect(screen.getByText(badge.children.props.children)).toBeInTheDocument();
    });
  });
});
