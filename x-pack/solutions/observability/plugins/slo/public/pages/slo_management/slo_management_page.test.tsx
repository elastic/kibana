/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { useFetchSloTemplateTags } from '../../hooks/use_fetch_slo_template_tags';
import { useFetchSloTemplates } from '../../hooks/use_fetch_slo_templates';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { render } from '../../utils/test_helper';
import { SloManagementPage } from './slo_management_page';

const mockNavigateToUrl = vi.fn();
const mockHistoryPush = vi.fn();

vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useHistory: () => ({
        push: mockHistoryPush,
        location: { pathname: '/management', search: '', hash: '' },
        listen: vi.fn(),
        replace: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/observability-shared-plugin/public', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/observability-shared-plugin/public')),
      useBreadcrumbs: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../hooks/use_kibana');
vi.mock('../../hooks/use_license');
vi.mock('../../hooks/use_permissions');
vi.mock('../../hooks/use_fetch_slo_definitions');
vi.mock('../../hooks/use_fetch_slo_templates');
vi.mock('../../hooks/use_fetch_slo_template_tags');
vi.mock('./components/slo_definitions/slo_management_table', () => {
      const mocked = {
      SloManagementTable: () => <div data-test-subj="sloManagementTable">SLO Management Table</div>,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components/slo_definitions/slo_management_outdated_filter_callout', () => {
      const mocked = {
      SloOutdatedFilterCallout: () => null,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../components/header_menu/header_menu', () => {
      const mocked = {
      HeaderMenu: () => null,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./context/bulk_operation', () => {
      const mocked = {
      BulkOperationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../context/action_modal', () => {
      const mocked = {
      ActionModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      useActionModal: () => ({ triggerAction: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./hooks/use_templates_url_search_state', () => {
      const mocked = {
      useTemplatesUrlSearchState: () => ({
        state: { search: '', tags: [], page: 0, perPage: 20 },
        onStateChange: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

const useKibanaMock = useKibana as Mock;
const useLicenseMock = useLicense as Mock;
const usePermissionsMock = usePermissions as Mock;
const useFetchSloDefinitionsMock = useFetchSloDefinitions as Mock;
const useFetchSloTemplatesMock = useFetchSloTemplates as Mock;
const useFetchSloTemplateTagsMock = useFetchSloTemplateTags as Mock;

function MockSearchBar(props: Record<string, unknown>) {
  return (
    <div data-test-subj="sloTemplatesSearchBar">
      {typeof props.renderQueryInputAppend === 'function' && props.renderQueryInputAppend()}
    </div>
  );
}

describe('SloManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        http: { basePath: { prepend: (path: string) => path } },
        application: { navigateToUrl: mockNavigateToUrl },
        unifiedSearch: { ui: { SearchBar: MockSearchBar } },
        serverless: undefined,
        inspector: { open: vi.fn() },
        uiSettings: { get: () => false },
        docLinks: { links: { observability: { slo: 'dummy_link' } } },
      },
    });
    useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
    usePermissionsMock.mockReturnValue({
      data: { hasAllReadRequested: true, hasAllWriteRequested: true },
    });
    useFetchSloDefinitionsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { total: 10 },
    });
    useFetchSloTemplatesMock.mockReturnValue({
      data: { total: 0, page: 1, perPage: 20, results: [] },
      isLoading: false,
      isError: false,
    });
    useFetchSloTemplateTagsMock.mockReturnValue({
      data: { tags: [] },
      isLoading: false,
      isError: false,
    });
  });

  it('renders with definitions tab selected by default', async () => {
    render(<SloManagementPage />);

    expect(screen.getByTestId('managementTabDefinitions')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('managementTabTemplates')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('sloManagementTable')).toBeTruthy();
    expect(await screen.findByTestId('headerControlActionsButton')).toBeTruthy();
  });

  it('navigates to templates tab when clicked', () => {
    render(<SloManagementPage />);

    fireEvent.click(screen.getByTestId('managementTabTemplates'));

    expect(mockHistoryPush).toHaveBeenCalledWith('/management/templates');
  });

  it('navigates to definitions tab when clicked', () => {
    render(<SloManagementPage />);

    fireEvent.click(screen.getByTestId('managementTabDefinitions'));

    expect(mockHistoryPush).toHaveBeenCalledWith('/management');
  });
});
