/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { parseSandboxAllowlistText, SandboxAllowlistSection } from './sandbox_allowlist_section';

const mockMutateAsync = jest.fn();
let mockFetchResult: {
  data?: { hosts: string[] };
  isLoading: boolean;
  error: Error | null;
};

jest.mock('./use_fetch_sandbox_allowlist', () => ({
  useFetchSandboxAllowlist: () => mockFetchResult,
}));
jest.mock('./use_save_sandbox_allowlist', () => ({
  useSaveSandboxAllowlist: () => ({ mutateAsync: mockMutateAsync, isLoading: false }),
}));

const renderSection = () =>
  render(
    <I18nProvider>
      <SandboxAllowlistSection />
    </I18nProvider>
  );

const typeHosts = (value: string) =>
  fireEvent.change(screen.getByTestId('nightshiftSandboxAllowlistTextArea'), {
    target: { value },
  });

describe('parseSandboxAllowlistText', () => {
  it('splits on newlines and commas and drops blanks', () => {
    expect(parseSandboxAllowlistText('a.example\n\n b.example , c.example\n')).toEqual([
      'a.example',
      'b.example',
      'c.example',
    ]);
  });
});

describe('SandboxAllowlistSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ hosts: [] });
    mockFetchResult = {
      data: { hosts: ['api.github.com'] },
      isLoading: false,
      error: null,
    };
  });

  it('shows the stored hosts and keeps save disabled until something changes', () => {
    renderSection();

    expect(screen.getByTestId('nightshiftSandboxAllowlistTextArea')).toHaveValue('api.github.com');
    expect(screen.getByTestId('nightshiftSandboxAllowlistSave')).toBeDisabled();
    expect(screen.getByText('1 of 32 hosts')).toBeInTheDocument();
  });

  it('warns when the allowlist is empty', () => {
    mockFetchResult = { data: { hosts: [] }, isLoading: false, error: null };
    renderSection();

    expect(screen.getByTestId('nightshiftSandboxAllowlistEmptyWarning')).toBeInTheDocument();
  });

  it('shows inline errors for wildcards and blocks saving', () => {
    renderSection();

    typeHosts('api.github.com\n*.github.com');

    expect(screen.getByText(/must not contain wildcards/)).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftSandboxAllowlistSave')).toBeDisabled();
  });

  it('blocks saving more than 32 hosts', () => {
    renderSection();

    typeHosts(Array.from({ length: 33 }, (_, index) => `h${index}.example`).join('\n'));

    expect(screen.getByText(/At most 32 hosts are allowed/)).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftSandboxAllowlistSave')).toBeDisabled();
  });

  it('saves the normalized hosts', async () => {
    renderSection();

    typeHosts('api.github.com\nUploads.GitHub.com.\nbücher.example');
    fireEvent.click(screen.getByTestId('nightshiftSandboxAllowlistSave'));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        hosts: ['api.github.com', 'uploads.github.com', 'xn--bcher-kva.example'],
      })
    );
  });
});
