/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Tag } from './tag';

describe('Tag', () => {
  it('should render text only when count is not provided', () => {
    render(<Tag {...{ text: 'Test Tag' }} />);

    expect(screen.getByTestId('tag-text')).toHaveTextContent('Test Tag');
    expect(screen.queryByTestId('tag-count')).not.toBeInTheDocument();
  });

  it('should render text only when count is 0', () => {
    render(<Tag {...{ text: 'Test Tag', count: 0 }} />);

    expect(screen.getByTestId('tag-text')).toHaveTextContent('Test Tag');
    expect(screen.queryByTestId('tag-count')).not.toBeInTheDocument();
  });

  it('should render count badge when count is greater than 0', () => {
    render(<Tag {...{ text: 'Test Tag', count: 5 }} />);

    expect(screen.getByTestId('tag-text')).toHaveTextContent('Test Tag');
    expect(screen.getByTestId('tag-count')).toHaveTextContent('5');
  });

  it('should render count badge only when text is not provided', () => {
    render(<Tag {...{ count: 5 }} />);

    expect(screen.queryByTestId('tag-text')).not.toBeInTheDocument();
    expect(screen.getByTestId('tag-count')).toHaveTextContent('5');
  });

  it('should apply text capitalization', () => {
    render(<Tag {...{ text: 'other types' }} />);
    expect(screen.getByTestId('tag-text')).toHaveTextContent('Other Types');
  });

  it('should handle rendering when no props are provided', () => {
    render(<Tag />);

    expect(screen.getByTestId('tag-wrapper')).toBeInTheDocument();
    expect(screen.queryByTestId('tag-text')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tag-count')).not.toBeInTheDocument();
  });
});
