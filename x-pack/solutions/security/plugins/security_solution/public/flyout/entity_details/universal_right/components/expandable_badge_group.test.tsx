/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiBadge } from '@elastic/eui';
import { ExpandableBadgeGroup } from './expandable_badge_group';

const badges = [
  <EuiBadge key="1">{'Badge 1'}</EuiBadge>,
  <EuiBadge key="2">{'Badge 2'}</EuiBadge>,
  <EuiBadge key="3">{'Badge 3'}</EuiBadge>,
  <EuiBadge key="4">{'Badge 4'}</EuiBadge>,
];

describe('ExpandableBadgeGroup', () => {
  it('renders all badges when initialBadgeLimit is not set', () => {
    render(<ExpandableBadgeGroup badges={badges} />);
    badges.forEach((badge) => {
      expect(screen.getByText(badge.props.children)).toBeInTheDocument();
    });
  });

  it('renders limited badges and expand button when initialBadgeLimit is set', () => {
    render(<ExpandableBadgeGroup badges={badges} initialBadgeLimit={2} />);
    expect(screen.getByText('Badge 1')).toBeInTheDocument();
    expect(screen.getByText('Badge 2')).toBeInTheDocument();
    expect(screen.queryByText('Badge 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Badge 4')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('expands to show all badges when expand button is clicked', () => {
    render(<ExpandableBadgeGroup badges={badges} initialBadgeLimit={2} />);
    fireEvent.click(screen.getByText('+2'));
    badges.forEach((badge) => {
      expect(screen.getByText(badge.props.children)).toBeInTheDocument();
    });
  });

  it('applies maxHeight style when maxHeight is set', () => {
    const { container } = render(<ExpandableBadgeGroup badges={badges} maxHeight={100} />);
    expect(container.firstChild).toHaveStyle('max-height: 100px');
  });
});
