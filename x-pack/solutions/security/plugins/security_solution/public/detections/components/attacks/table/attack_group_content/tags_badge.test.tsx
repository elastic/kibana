/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

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

  it('should open popover with tags when badge is clicked', async () => {
    const tags = ['tag1', 'tag2'];
    const { getByTestId, findByText } = render(
      <TestProviders>
        <TagsBadge tags={tags} />
      </TestProviders>
    );

    const badgeButton = getByTestId('attack-tags-badgeDisplayPopoverButton');
    badgeButton.click();

    expect(await findByText('Tags')).toBeInTheDocument(); // Title
    expect(await findByText('tag1')).toBeInTheDocument();
    expect(await findByText('tag2')).toBeInTheDocument();
  });
});
