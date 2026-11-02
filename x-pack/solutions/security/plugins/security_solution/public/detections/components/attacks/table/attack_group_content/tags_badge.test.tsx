/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { TagsBadge } from './tags_badge';
import { TestProviders } from '../../../../../common/mock/test_providers';

describe('TagsBadge', () => {
  it('should render nothing when tags array is empty', () => {
    const { container } = render(
      <TestProviders>
        <TagsBadge tags={[]} />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when tags array is undefined', () => {
    const { container } = render(
      <TestProviders>
        <TagsBadge />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should render the badge with correct number of tags', () => {
    const tags = ['tag1', 'tag2', 'tag3'];
    const { getByTestId } = render(
      <TestProviders>
        <TagsBadge tags={tags} />
      </TestProviders>
    );

    expect(getByTestId('attack-tags-badge')).toBeInTheDocument();
    expect(getByTestId('attack-tags-badgeDisplayPopoverButton')).toHaveTextContent('3');
  });

  it('should open popover with tags when badge is clicked', () => {
    const tags = ['tag1', 'tag2'];
    const { getByTestId, getByText } = render(
      <TestProviders>
        <TagsBadge tags={tags} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('attack-tags-badgeDisplayPopoverButton'));

    expect(getByText('Tags')).toBeInTheDocument(); // Title
    expect(getByText('tag1')).toBeInTheDocument();
    expect(getByText('tag2')).toBeInTheDocument();
  });
});
