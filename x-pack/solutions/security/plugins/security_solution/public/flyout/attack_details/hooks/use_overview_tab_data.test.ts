/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useOverviewTabData } from './use_overview_tab_data';
import { useAttackDetailsContext } from '../context';
import { getField } from '../../document_details/shared/utils';

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

jest.mock('../../document_details/shared/utils', () => ({
  getField: jest.fn(),
}));

describe('useOverviewTabData', () => {
  const getFieldsDataMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
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

    (getField as jest.Mock).mockImplementation((value) => value);

    const { result } = renderHook(() => useOverviewTabData());

    expect(result.current.summaryMarkdown).toBe('Summary raw');
    expect(result.current.summaryMarkdownWithReplacements).toBe('Summary with replacements raw');
    expect(result.current.detailsMarkdown).toBe('Details raw');
    expect(result.current.detailsMarkdownWithReplacements).toBe('Details with replacements raw');
  });

  it('should default to empty strings when getField returns null/undefined', () => {
    getFieldsDataMock.mockReturnValue(null);
    (getField as jest.Mock).mockReturnValue(undefined);

    const { result } = renderHook(() => useOverviewTabData());

    expect(result.current).toEqual({
      summaryMarkdown: '',
      summaryMarkdownWithReplacements: '',
      detailsMarkdown: '',
      detailsMarkdownWithReplacements: '',
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

    (getField as jest.Mock).mockImplementation((value) => value);

    const { result } = renderHook(() => useOverviewTabData());

    expect(result.current.summaryMarkdown).toBe('Only summary exists');
    expect(result.current.summaryMarkdownWithReplacements).toBe('');
    expect(result.current.detailsMarkdown).toBe('');
    expect(result.current.detailsMarkdownWithReplacements).toBe('');
  });

  it('should call getFieldsData with the expected field names', () => {
    getFieldsDataMock.mockReturnValue(null);
    (getField as jest.Mock).mockImplementation((value) => value);

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
});
