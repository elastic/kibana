/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useOverviewTabData } from './use_overview_tab_data';
import { useAttackDetailsContext } from '../context';
import { getField } from '../../document_details/shared/utils';

vi.mock('../context', () => {
  const mocked = {
    useAttackDetailsContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../document_details/shared/utils', () => {
  const mocked = {
    getField: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useOverviewTabData', () => {
  const getFieldsDataMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAttackDetailsContext as Mock).mockReturnValue({
      getFieldsData: getFieldsDataMock,
    });
  });

  it('should return correct overview tab data when fields exist', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      switch (field) {
        case 'kibana.alert.attack_discovery.summary_markdown':
          return 'Summary raw';
        case 'kibana.alert.attack_discovery.summary_markdown_with_replacements':
          return 'Summary with replacements raw';
        case 'kibana.alert.attack_discovery.details_markdown':
          return 'Details raw';
        case 'kibana.alert.attack_discovery.details_markdown_with_replacements':
          return 'Details with replacements raw';
        default:
          return null;
      }
    });

    (getField as Mock).mockImplementation((value) => value);

    const { result } = renderHook(() => useOverviewTabData());

    expect(result.current.summaryMarkdown).toBe('Summary raw');
    expect(result.current.summaryMarkdownWithReplacements).toBe('Summary with replacements raw');
    expect(result.current.detailsMarkdown).toBe('Details raw');
    expect(result.current.detailsMarkdownWithReplacements).toBe('Details with replacements raw');
  });

  it('should default to empty strings when getField returns null/undefined', () => {
    getFieldsDataMock.mockReturnValue(null);
    (getField as Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useOverviewTabData());

    expect(result.current).toEqual({
      summaryMarkdown: '',
      summaryMarkdownWithReplacements: '',
      detailsMarkdown: '',
      detailsMarkdownWithReplacements: '',
      originalAlertIds: [],
    });
  });

  it('should handle missing individual fields by returning empty strings for those fields', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      // Only one field exists, others are missing
      if (field === 'kibana.alert.attack_discovery.summary_markdown') {
        return 'Only summary exists';
      }
      return null;
    });

    (getField as Mock).mockImplementation((value) => value);

    const { result } = renderHook(() => useOverviewTabData());

    expect(result.current.summaryMarkdown).toBe('Only summary exists');
    expect(result.current.summaryMarkdownWithReplacements).toBe('');
    expect(result.current.detailsMarkdown).toBe('');
    expect(result.current.detailsMarkdownWithReplacements).toBe('');
  });

  it('should call getFieldsData with the expected field names', () => {
    getFieldsDataMock.mockReturnValue(null);
    (getField as Mock).mockImplementation((value) => value);

    renderHook(() => useOverviewTabData());

    expect(getFieldsDataMock).toHaveBeenCalledWith(
      'kibana.alert.attack_discovery.summary_markdown'
    );
    expect(getFieldsDataMock).toHaveBeenCalledWith(
      'kibana.alert.attack_discovery.summary_markdown_with_replacements'
    );
    expect(getFieldsDataMock).toHaveBeenCalledWith(
      'kibana.alert.attack_discovery.details_markdown'
    );
    expect(getFieldsDataMock).toHaveBeenCalledWith(
      'kibana.alert.attack_discovery.details_markdown_with_replacements'
    );
  });

  it('should return originalAlertIds when attack is provided', () => {
    getFieldsDataMock.mockReturnValue(null);
    (getField as Mock).mockReturnValue(undefined);
    (useAttackDetailsContext as Mock).mockReturnValue({
      getFieldsData: getFieldsDataMock,
      attack: {
        alertIds: ['alert-1', 'alert-2'],
        replacements: { 'alert-1': 'original-1' },
      },
    });

    const { result } = renderHook(() => useOverviewTabData());

    expect(result.current.originalAlertIds).toEqual(['original-1', 'alert-2']);
  });
});
