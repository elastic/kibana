/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { FormEvent } from 'react';
import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock';
import { ValueListsForm } from './form';
import { useImportList } from '@kbn/securitysolution-list-hooks';

vi.mock('@kbn/securitysolution-list-hooks');
const mockUseImportList = useImportList as Mock;

const mockFile = {
  name: 'foo.csv',
  type: 'text/csv',
} as unknown as File;

const mockSelectFile: <P>(container: ReactWrapper<P>, file: File) => Promise<void> = async (
  container,
  file
) => {
  const fileChange = container.find('EuiFilePicker').last().prop('onChange');
  await waitFor(() => {
    if (fileChange) {
      fileChange({ item: () => file } as unknown as FormEvent);
    }
  });
};

describe('ValueListsForm', () => {
  let mockImportList: Mock;

  beforeEach(() => {
    mockImportList = vi.fn();
    mockUseImportList.mockImplementation(() => ({
      start: mockImportList,
    }));
  });

  it('disables upload button when file is absent', () => {
    const container = mount(
      <TestProviders>
        <ValueListsForm onError={vi.fn()} onSuccess={vi.fn()} />
      </TestProviders>
    );

    expect(
      container.find('button[data-test-subj="value-lists-form-import-action"]').prop('disabled')
    ).toEqual(true);
  });

  it('calls importList when upload is clicked', async () => {
    const container = mount(
      <TestProviders>
        <ValueListsForm onError={vi.fn()} onSuccess={vi.fn()} />
      </TestProviders>
    );

    await mockSelectFile(container, mockFile);

    container.find('button[data-test-subj="value-lists-form-import-action"]').simulate('click');

    expect(mockImportList).toHaveBeenCalledWith(expect.objectContaining({ file: mockFile }));
  });

  it('calls onError if import fails', async () => {
    mockUseImportList.mockImplementation(() => ({
      start: vi.fn(),
      error: 'whoops',
    }));

    const onError = vi.fn();
    mount(
      <TestProviders>
        <ValueListsForm onError={onError} onSuccess={vi.fn()} />
      </TestProviders>
    );

    expect(onError).toHaveBeenCalledWith('whoops');
  });

  it('disables upload and displays an error if file has invalid extension', async () => {
    const badMockFile = {
      name: 'foo.pdf',
      type: 'application/pdf',
    } as unknown as File;

    const container = mount(
      <TestProviders>
        <ValueListsForm onError={vi.fn()} onSuccess={vi.fn()} />
      </TestProviders>
    );

    await mockSelectFile(container, badMockFile);

    expect(
      container.find('button[data-test-subj="value-lists-form-import-action"]').prop('disabled')
    ).toEqual(true);

    expect(container.find('div[data-test-subj="value-list-file-picker-row"]').text()).toContain(
      'File must be one of the following types: [text/csv, text/plain]'
    );
  });

  it('calls onSuccess if import succeeds', async () => {
    mockUseImportList.mockImplementation(() => ({
      start: vi.fn(),
      result: { mockResult: true },
    }));

    const onSuccess = vi.fn();
    mount(
      <TestProviders>
        <ValueListsForm onSuccess={onSuccess} onError={vi.fn()} />
      </TestProviders>
    );

    expect(onSuccess).toHaveBeenCalledWith({ mockResult: true });
  });
});
