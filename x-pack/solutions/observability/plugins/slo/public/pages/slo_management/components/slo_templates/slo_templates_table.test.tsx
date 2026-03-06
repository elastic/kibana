/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { useFetchSloTemplates } from '../../../../hooks/use_fetch_slo_templates';
import { useFetchSloTemplateTags } from '../../../../hooks/use_fetch_slo_template_tags';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePermissions } from '../../../../hooks/use_permissions';
import { render } from '../../../../utils/test_helper';
import { DEFAULT_STATE } from '../../hooks/use_templates_url_search_state';
import { SloTemplatesTable } from './slo_templates_table';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_permissions');
jest.mock('../../../../hooks/use_fetch_slo_templates');
jest.mock('../../../../hooks/use_fetch_slo_template_tags');

const useKibanaMock = useKibana as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const useFetchSloTemplatesMock = useFetchSloTemplates as jest.Mock;
const useFetchSloTemplateTagsMock = useFetchSloTemplateTags as jest.Mock;

const mockNavigateToUrl = jest.fn();
const mockOnStateChange = jest.fn();

const MockSearchBar = (props: Record<string, unknown>) => (
  <div data-test-subj="sloTemplatesSearchBar">
    <input data-test-subj="sloTemplatesSearchInput" />
    {typeof props.renderQueryInputAppend === 'function' && props.renderQueryInputAppend()}
  </div>
);

const defaultProps = {
  state: DEFAULT_STATE,
  onStateChange: mockOnStateChange,
};

describe('SloTemplatesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { prepend: (path: string) => path } },
        application: { navigateToUrl: mockNavigateToUrl },
        unifiedSearch: { ui: { SearchBar: MockSearchBar } },
      },
    });
    usePermissionsMock.mockReturnValue({
      data: { hasAllReadRequested: true, hasAllWriteRequested: true },
    });
    useFetchSloTemplateTagsMock.mockReturnValue({
      data: { tags: ['production', 'latency'] },
      isLoading: false,
      isError: false,
    });
  });

  it('renders the empty state when no templates exist', () => {
    useFetchSloTemplatesMock.mockReturnValue({
      data: { total: 0, page: 1, perPage: 20, results: [] },
      isLoading: false,
      isError: false,
    });

    render(<SloTemplatesTable {...defaultProps} />);

    expect(screen.getByTestId('sloTemplatesEmptyPrompt')).toBeTruthy();
    expect(screen.getByText(/No SLO templates found/)).toBeTruthy();
  });

  it('renders the table with templates', () => {
    useFetchSloTemplatesMock.mockReturnValue({
      data: {
        total: 2,
        page: 1,
        perPage: 20,
        results: [
          {
            templateId: 'template-1',
            name: 'Latency SLO Template',
            description: 'A template for latency SLOs',
            tags: ['latency', 'production'],
          },
          {
            templateId: 'template-2',
            name: 'Availability SLO Template',
            description: 'A template for availability SLOs',
            tags: ['availability'],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<SloTemplatesTable {...defaultProps} />);

    expect(screen.getByText('Latency SLO Template')).toBeTruthy();
    expect(screen.getByText('Availability SLO Template')).toBeTruthy();
    expect(screen.getByText('Showing 2 of 2 SLO templates')).toBeTruthy();
  });

  it('renders loading state', () => {
    useFetchSloTemplatesMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<SloTemplatesTable {...defaultProps} />);

    expect(screen.getByText('Showing 0 of 0 SLO templates')).toBeTruthy();
  });

  it('renders error state', () => {
    useFetchSloTemplatesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<SloTemplatesTable {...defaultProps} />);

    expect(screen.getByText(/An error occurred while retrieving SLO templates/)).toBeTruthy();
  });

  it('renders the search bar with tag filter', () => {
    useFetchSloTemplatesMock.mockReturnValue({
      data: { total: 1, page: 1, perPage: 20, results: [{ templateId: 't1', name: 'Test' }] },
      isLoading: false,
      isError: false,
    });

    render(<SloTemplatesTable {...defaultProps} />);

    expect(screen.getByTestId('sloTemplatesSearchBar')).toBeTruthy();
    expect(screen.getByTestId('sloTemplatesFilterByTag')).toBeTruthy();
  });
});
