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
  TruncatedListWithTooltip,
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

  it('renders a single value formatted (capitalized, underscores replaced) without a "+N More" button', () => {
    render(
      <TestProviders>
        <EntitySourceValue values={['entityanalytics_okta']} />
      </TestProviders>
    );

    expect(screen.getByText('Entityanalytics Okta')).toBeInTheDocument();
    expect(screen.queryByText('entityanalytics_okta')).not.toBeInTheDocument();
    expect(screen.queryByText(/\+.*More/)).not.toBeInTheDocument();
  });

  it('renders the first formatted value and a "+N More" button when there are multiple values', () => {
    render(
      <TestProviders>
        <EntitySourceValue values={['okta', 'entra_id', 'active_directory']} />
      </TestProviders>
    );

    expect(screen.getByText('Okta')).toBeInTheDocument();
    expect(screen.getByText(/\+2/)).toBeInTheDocument();
    expect(screen.getByText(/More/)).toBeInTheDocument();
  });

  it('exposes the remaining formatted values via the tooltip', async () => {
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

describe('TruncatedListWithTooltip', () => {
  it('uses the provided "More" label id', () => {
    render(
      <TestProviders>
        <TruncatedListWithTooltip
          values={['a', 'b']}
          moreLabelId="xpack.securitySolution.test.customMore"
          moreLabelDefaultMessage="More things"
          data-test-subj="custom"
        />
      </TestProviders>
    );

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText(/\+1/)).toBeInTheDocument();
    expect(screen.getByText(/More things/)).toBeInTheDocument();
    expect(screen.getByTestId('custom-more')).toBeInTheDocument();
  });
});
