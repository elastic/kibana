/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Tag } from './tag';

const TEST_SUBJ_WRAPPER = 'tag-wrapper';
const TEST_SUBJ_COUNT = 'tag-count';
const TEST_SUBJ_TEXT = 'tag-text';

describe('Tag', () => {
  it('renders text only', () => {
    render(<Tag text="Test Tag" />);

    expect(screen.queryByTestId(TEST_SUBJ_COUNT)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent('Test Tag');
  });

  it('renders text only when count is lower or equal to 1', () => {
    const { rerender } = render(<Tag text="Test Tag" count={-1} />);

    expect(screen.queryByTestId(TEST_SUBJ_COUNT)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent('Test Tag');

    rerender(<Tag text="Test Tag" count={0} />);

    expect(screen.queryByTestId(TEST_SUBJ_COUNT)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent('Test Tag');

    rerender(<Tag text="Test Tag" count={1} />);

    expect(screen.queryByTestId(TEST_SUBJ_COUNT)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent('Test Tag');
  });

  it('renders badge when count is greater than 1', () => {
    render(<Tag text="Test Tag" count={5} />);

    expect(screen.getByTestId(TEST_SUBJ_COUNT)).toHaveTextContent('5');
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent('Test Tag');
  });

  it('renders badge and fallback text when text is not provided', () => {
    render(<Tag count={5} />);

    expect(screen.getByTestId(TEST_SUBJ_COUNT)).toHaveTextContent('5');
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent('N/A');
  });

  it('renders badge with abbreviated count when number is very high', async () => {
    const { rerender } = render(<Tag count={100} />);
    expect(screen.getByTestId(TEST_SUBJ_COUNT)).toHaveTextContent('100');

    await act(async () => {
      rerender(<Tag count={1_000} />);
    });
    expect(screen.getByTestId(TEST_SUBJ_COUNT)).toHaveTextContent('1.0k');

    await act(async () => {
      rerender(<Tag count={1_000_000} />);
    });
    expect(screen.getByTestId(TEST_SUBJ_COUNT)).toHaveTextContent('1.0m');

    await act(async () => {
      rerender(<Tag count={1_000_000_000} />);
    });
    expect(screen.getByTestId(TEST_SUBJ_COUNT)).toHaveTextContent('1.0b');

    await act(async () => {
      rerender(<Tag count={1_000_000_000_000} />);
    });
    expect(screen.getByTestId(TEST_SUBJ_COUNT)).toHaveTextContent('1.0t');
  });

  it('renders text with capitalization', () => {
    render(<Tag text="other types" />);
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent('other types'); // tests won't see "Other Types"
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveStyle('text-transform: capitalize');
  });

  it('renders only fallback text when no props are provided', () => {
    render(<Tag />);

    expect(screen.getByTestId(TEST_SUBJ_WRAPPER)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_COUNT)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent('N/A');
  });
});
