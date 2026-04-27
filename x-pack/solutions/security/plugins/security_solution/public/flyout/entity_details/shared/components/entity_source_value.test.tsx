/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import {
  EntitySourceValue,
  TruncatedBadgeList,
  formatEntitySource,
  toEntitySourceArray,
} from './entity_source_value';

describe('formatEntitySource', () => {
  it('replaces underscores with spaces and capitalizes each word', () => {
    expect(formatEntitySource('entityanalytics_okta')).toBe('Entityanalytics Okta');
    expect(formatEntitySource('entityanalytics_entra_id')).toBe('Entityanalytics Entra Id');
  });

  it('capitalizes a single-word token', () => {
    expect(formatEntitySource('okta')).toBe('Okta');
    expect(formatEntitySource('azure')).toBe('Azure');
  });

  it('leaves an empty string unchanged', () => {
    expect(formatEntitySource('')).toBe('');
  });
});

describe('toEntitySourceArray', () => {
  it('returns an empty array for null or undefined', () => {
    expect(toEntitySourceArray(undefined)).toEqual([]);
    expect(toEntitySourceArray(null)).toEqual([]);
  });

  it('wraps a string value in an array', () => {
    expect(toEntitySourceArray('okta')).toEqual(['okta']);
  });

  it('returns an array of strings unchanged', () => {
    expect(toEntitySourceArray(['okta', 'entra_id'])).toEqual(['okta', 'entra_id']);
  });

  it('filters out non-string entries from an array', () => {
    expect(toEntitySourceArray(['okta', 2, null, undefined, 'entra_id'])).toEqual([
      'okta',
      'entra_id',
    ]);
  });

  it('returns an empty array for unsupported types', () => {
    expect(toEntitySourceArray(42)).toEqual([]);
    expect(toEntitySourceArray(true)).toEqual([]);
    expect(toEntitySourceArray({})).toEqual([]);
  });
});

describe('EntitySourceValue', () => {
  it('renders the empty placeholder when values is empty', () => {
    const { container } = render(
      <TestProviders>
        <EntitySourceValue values={[]} />
      </TestProviders>
    );

    expect(container.textContent).toContain('—');
  });

  it('renders a single formatted value as plain text without an overflow affordance', () => {
    render(
      <TestProviders>
        <EntitySourceValue values={['entityanalytics_okta']} />
      </TestProviders>
    );

    expect(screen.getByText('Entityanalytics Okta')).toBeInTheDocument();
    expect(screen.queryByText('entityanalytics_okta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entitySourceValue-more')).not.toBeInTheDocument();
  });

  it('renders only the first formatted value inline and collapses the rest into a +N overflow badge', () => {
    render(
      <TestProviders>
        <EntitySourceValue values={['okta', 'entra_id', 'active_directory']} />
      </TestProviders>
    );

    expect(screen.getByText('Okta')).toBeInTheDocument();
    expect(screen.getByTestId('entitySourceValue-more')).toHaveTextContent('+2');
    expect(screen.getByTestId('entitySourceValue-more')).not.toHaveTextContent('more');
  });

  it('exposes the remaining formatted values via the overflow tooltip', async () => {
    render(
      <TestProviders>
        <EntitySourceValue values={['okta', 'entra_id', 'active_directory']} />
      </TestProviders>
    );

    fireEvent.mouseOver(screen.getByTestId('entitySourceValue-more'));

    await waitFor(() => {
      expect(screen.getByText('Entra Id, Active Directory')).toBeInTheDocument();
    });
  });
});

describe('TruncatedBadgeList', () => {
  it('renders the empty placeholder when values is empty', () => {
    const { container } = render(
      <TestProviders>
        <TruncatedBadgeList values={[]} data-test-subj="custom" />
      </TestProviders>
    );

    expect(container.textContent).toContain('—');
  });

  it('renders the first value as plain text and a +N overflow badge', () => {
    render(
      <TestProviders>
        <TruncatedBadgeList values={['a', 'b', 'c']} data-test-subj="custom" />
      </TestProviders>
    );

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByTestId('custom-more')).toHaveTextContent('+2');
  });

  it('honors a custom maxVisible to render more inline values before collapsing', () => {
    render(
      <TestProviders>
        <TruncatedBadgeList values={['a', 'b', 'c']} maxVisible={2} data-test-subj="custom" />
      </TestProviders>
    );

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByTestId('custom-more')).toHaveTextContent('+1');
  });

  it('applies formatValue to both the inline value and the overflow tooltip list', async () => {
    render(
      <TestProviders>
        <TruncatedBadgeList
          values={['okta', 'entra_id']}
          formatValue={formatEntitySource}
          data-test-subj="custom"
        />
      </TestProviders>
    );

    expect(screen.getByText('Okta')).toBeInTheDocument();
    fireEvent.mouseOver(screen.getByTestId('custom-more'));
    await waitFor(() => {
      expect(screen.getByText('Entra Id')).toBeInTheDocument();
    });
  });

  it('exposes the hidden count on the overflow badge via aria-label for screen readers', () => {
    render(
      <TestProviders>
        <TruncatedBadgeList values={['a', 'b', 'c']} data-test-subj="custom" />
      </TestProviders>
    );

    expect(screen.getByTestId('custom-more')).toHaveAttribute('aria-label', '2 more');
  });
});
