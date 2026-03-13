/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../../../common/mock/endpoint';
import { EndpointScriptsGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_scripts_generator';
import { SCRIPTS_LIBRARY_PATH } from '../../../../../../common/constants';
import { useUserPrivileges as _useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import { useToasts } from '../../../../../common/lib/kibana';
import { ScriptsLibrary } from './scripts_library';
import { useGetEndpointScriptsList } from '../../../../hooks/script_library';
import type { EndpointScript } from '../../../../../../common/endpoint/types';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../hooks/script_library/use_get_scripts_list');
jest.mock('../../../../../common/components/user_privileges');
const useUserPrivilegesMock = _useUserPrivileges as jest.Mock;
const useGetEndpointScriptsListMock = useGetEndpointScriptsList as jest.Mock;
const useToastsMock = useToasts as jest.Mock;

describe('ScriptsLibrary', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let scriptsGenerator: EndpointScriptsGenerator;
  let defaultMockGetScriptsResponse: ReturnType<typeof useGetEndpointScriptsListMock>;

  const getScriptsListMock = (scriptsList: EndpointScript[]) => {
    (useGetEndpointScriptsListMock as jest.Mock).mockReturnValue({
      ...defaultMockGetScriptsResponse,
      data: {
        data: scriptsList,
        page: 1,
        pageSize: 10,
        sortDirection: 'asc',
        sortField: 'name',
        total: scriptsList.length,
      },
      isFetching: false,
      isFetched: true,
    });
  };

  beforeEach(() => {
    scriptsGenerator = new EndpointScriptsGenerator('scripts-library-tests');

    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointAuthzInitialStateMock(),
    });
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);

    (useToastsMock as jest.Mock).mockReturnValue({
      addDanger: jest.fn(),
    });

    defaultMockGetScriptsResponse = {
      data: {
        data: [],
        page: 1,
        pageSize: 10,
        sortDirection: 'asc',
        sortField: 'name',
        total: 0,
      },
      isFetching: false,
      isFetched: true,
      refetch: jest.fn(),
    };

    (useGetEndpointScriptsListMock as jest.Mock).mockReturnValue(defaultMockGetScriptsResponse);

    // navigate to scripts lib. page before each test
    history.push(SCRIPTS_LIBRARY_PATH);

    render = () => {
      renderResult = mockedContext.render(<ScriptsLibrary data-test-subj="test" />);
      return renderResult;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Page elements', () => {
    it('should not show the upload button when user does not have `canWriteScriptsLibrary` privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: false,
        },
      });

      render();
      const { queryByTestId } = renderResult;
      const uploadButton = queryByTestId('test-upload-script-button');

      expect(uploadButton).not.toBeInTheDocument();
    });

    it('should show an empty state prompt with upload button when no data', () => {
      render();
      const { getByText, getByTestId } = renderResult;

      expect(getByTestId('test-no-data-empty-prompt')).toBeInTheDocument();
      expect(getByText('Add your first script')).toBeInTheDocument();
      expect(getByTestId('test-no-data-empty-prompt-upload-button')).toBeInTheDocument();
    });

    it('should not show upload button when no data and no `canWriteScriptsLibrary` privilege on the empty prompt', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: false,
        },
      });

      render();
      const { getByTestId } = renderResult;

      expect(getByTestId('test-no-data-empty-prompt-title-no-entries')).toBeInTheDocument();
    });

    it('renders the Scripts Library page', () => {
      render();

      expect(renderResult.getByTestId('test')).toBeInTheDocument();
    });

    it('should show the page header when data is available and fetched', () => {
      const scriptId = 'script-1';
      const script = scriptsGenerator.generate({ id: scriptId });
      getScriptsListMock([script]);

      render();
      const { getByTestId } = renderResult;

      expect(getByTestId('test-header')).toBeInTheDocument();
      expect(getByTestId('header-page-title').textContent).toEqual('Scripts Library');
      expect(getByTestId('header-panel-subtitle').textContent).toEqual(
        'View and manage scripts to upload and execute on Elastic Defend agents.'
      );
    });
  });

  describe('Interactions (with data)', () => {
    const scriptId = 'script-1';

    beforeEach(() => {
      const script = scriptsGenerator.generate({ id: scriptId });
      getScriptsListMock([script]);
    });

    it('should show an error message when there is an error with fetching scripts', () => {
      (useGetEndpointScriptsListMock as jest.Mock).mockReturnValue({
        ...defaultMockGetScriptsResponse,
        isFetching: false,
        isFetched: true,
        error: {
          name: 'Scripts list error',
          message: 'fetch failed!',
          body: {
            message: 'fetch failed!',
          },
        },
      });

      render();
      expect(useToastsMock().addDanger).toHaveBeenCalledWith(
        'There was an error fetching the scripts list: fetch failed!'
      );
    });

    it('should show details flyout when clicked on row action `View details` item', () => {
      render();

      const { getByTestId } = renderResult;
      const range = getByTestId('test-table-record-range-label');
      expect(range).toHaveTextContent(`Showing 1-1 of 1 script`);

      const actionsButton = getByTestId(`test-table-row-actions-${scriptId}`);
      expect(actionsButton).toBeInTheDocument();
      userEvent.click(actionsButton);

      waitFor(() => {
        const actionsPanel = getByTestId(`test-table-row-actions-${scriptId}-contextMenuPanel`);
        expect(actionsPanel).toBeInTheDocument();

        const detailsButton = getByTestId('actionDetails');
        expect(detailsButton).toBeInTheDocument();
        userEvent.click(detailsButton);
        expect(getByTestId('test-endpointScriptFlyout-details')).toBeInTheDocument();
      });
    });

    it('should show create flyout when upload button is clicked from page header', () => {
      render();

      const { getByTestId } = renderResult;
      const uploadButton = getByTestId('test-upload-script-button');
      userEvent.click(uploadButton);

      waitFor(() => {
        expect(getByTestId('test-endpointScriptFlyout-create')).toBeInTheDocument();
        expect(history.location.search).toContain('show=create');
      });
    });

    it('should show edit flyout when clicked on row action `Edit` item', () => {
      render();

      const { getByTestId } = renderResult;
      const range = getByTestId('test-table-record-range-label');
      expect(range).toHaveTextContent(`Showing 1-1 of 1 script`);

      const actionsButton = getByTestId(`test-table-row-actions-${scriptId}`);
      expect(actionsButton).toBeInTheDocument();
      userEvent.click(actionsButton);

      waitFor(() => {
        const actionsPanel = getByTestId(`test-table-row-actions-${scriptId}-contextMenuPanel`);
        expect(actionsPanel).toBeInTheDocument();

        const editButton = getByTestId('actionEdit');
        expect(editButton).toBeInTheDocument();
        userEvent.click(editButton);
        expect(getByTestId('test-endpointScriptFlyout-edit')).toBeInTheDocument();
      });
    });

    it('should not show edit flyout when loaded via URL without `canWriteScriptsLibrary` privilege', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: false,
        },
      });

      act(() => history.push(`${SCRIPTS_LIBRARY_PATH}?show=edit&selectedScriptId=${scriptId}`));
      render();

      const { queryByTestId } = renderResult;
      expect(queryByTestId('test-endpointScriptFlyout-edit')).not.toBeInTheDocument();
    });
  });

  describe('Upload button and create flyout', () => {
    beforeEach(() => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: true,
        },
      });
    });

    it('should show create flyout when upload button is clicked from empty state', () => {
      render();

      const { getByTestId } = renderResult;
      const uploadButton = getByTestId('test-no-data-empty-prompt-upload-button');
      userEvent.click(uploadButton);

      waitFor(() => {
        expect(getByTestId('test-endpointScriptFlyout-create')).toBeInTheDocument();
        expect(history.location.search).toContain('show=create');
      });
    });

    it('should show create flyout when navigating to URL with show=create', () => {
      act(() => history.push(`${SCRIPTS_LIBRARY_PATH}?show=create`));
      render();

      const { getByTestId } = renderResult;
      expect(getByTestId('test-endpointScriptFlyout-create')).toBeInTheDocument();
    });

    it('should NOT show create flyout via URL without canWriteScriptsLibrary privilege', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: false,
        },
      });

      act(() => history.push(`${SCRIPTS_LIBRARY_PATH}?show=create`));
      render();

      const { queryByTestId } = renderResult;
      expect(queryByTestId('test-endpointScriptFlyout-create')).not.toBeInTheDocument();
    });
  });

  describe('Details flyout via URL', () => {
    it('should show details flyout when navigating to URL with show=details', () => {
      const scriptId = 'script-1';
      const script = scriptsGenerator.generate({ id: scriptId });
      getScriptsListMock([script]);

      act(() => history.push(`${SCRIPTS_LIBRARY_PATH}?show=details&selectedScriptId=${scriptId}`));
      render();

      const { getByTestId } = renderResult;
      expect(getByTestId('test-endpointScriptFlyout-details')).toBeInTheDocument();
    });

    it('should show details flyout even without canWriteScriptsLibrary privilege', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: false,
        },
      });

      const scriptId = 'script-1';
      const script = scriptsGenerator.generate({ id: scriptId });
      getScriptsListMock([script]);

      act(() => history.push(`${SCRIPTS_LIBRARY_PATH}?show=details&selectedScriptId=${scriptId}`));
      render();

      const { getByTestId } = renderResult;
      expect(getByTestId('test-endpointScriptFlyout-details')).toBeInTheDocument();
    });
  });

  describe('Delete modal workflow', () => {
    it('should open delete modal when delete action is clicked', () => {
      const scriptId = 'script-1';
      const script = scriptsGenerator.generate({ id: scriptId, name: 'Test Script' });
      getScriptsListMock([script]);

      render();

      const { getByTestId } = renderResult;
      const actionsButton = getByTestId(`test-table-row-actions-${scriptId}`);
      userEvent.click(actionsButton);

      waitFor(() => {
        const deleteButton = getByTestId('actionDelete');
        userEvent.click(deleteButton);
        expect(getByTestId('test-delete-modal')).toBeInTheDocument();
      });
    });

    it('should refetch scripts list after successful delete', () => {
      const scriptId = 'script-1';
      const script = scriptsGenerator.generate({ id: scriptId });
      const mockRefetch = jest.fn();

      (useGetEndpointScriptsListMock as jest.Mock).mockReturnValue({
        ...defaultMockGetScriptsResponse,
        data: {
          data: [script],
          page: 1,
          pageSize: 10,
          sortDirection: 'asc',
          sortField: 'name',
          total: 1,
        },
        isFetching: false,
        isFetched: true,
        refetch: mockRefetch,
      });

      render();

      const { getByTestId } = renderResult;
      const actionsButton = getByTestId(`test-table-row-actions-${scriptId}`);
      userEvent.click(actionsButton);

      waitFor(() => {
        const deleteButton = getByTestId('actionDelete');
        userEvent.click(deleteButton);
        expect(getByTestId('test-delete-modal')).toBeInTheDocument();

        // Simulate successful delete
        const confirmButton = getByTestId('test-delete-modal-delete-button');
        userEvent.click(confirmButton);

        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('should close modal without refetch when cancel is clicked', () => {
      const scriptId = 'script-1';
      const script = scriptsGenerator.generate({ id: scriptId });
      const mockRefetch = jest.fn();

      (useGetEndpointScriptsListMock as jest.Mock).mockReturnValue({
        ...defaultMockGetScriptsResponse,
        data: {
          data: [script],
          page: 1,
          pageSize: 10,
          sortDirection: 'asc',
          sortField: 'name',
          total: 1,
        },
        isFetching: false,
        isFetched: true,
        refetch: mockRefetch,
      });

      render();

      const { getByTestId, queryByTestId } = renderResult;
      const actionsButton = getByTestId(`test-table-row-actions-${scriptId}`);
      userEvent.click(actionsButton);

      waitFor(() => {
        const deleteButton = getByTestId('actionDelete');
        userEvent.click(deleteButton);
        expect(getByTestId('test-delete-modal')).toBeInTheDocument();

        const cancelButton = getByTestId('test-delete-modal-cancelButton');
        userEvent.click(cancelButton);

        expect(queryByTestId('test-delete-modal')).not.toBeInTheDocument();
        expect(mockRefetch).not.toHaveBeenCalled();
      });
    });
  });

  describe('Pagination and sorting URL updates', () => {
    it('should update URL params when changing `page`', () => {
      const scripts = scriptsGenerator.generateListOfScripts(Array.from({ length: 30 }));
      getScriptsListMock(scripts);

      render();

      const nextPageButton = renderResult.getByTestId('pagination-button-next');
      userEvent.click(nextPageButton);

      waitFor(() => {
        expect(history.location.search).toContain('page=2');
      });
    });

    it('should update URL params when changing `pageSize`', () => {
      const scripts = scriptsGenerator.generateListOfScripts(Array.from({ length: 30 }));
      getScriptsListMock(scripts);

      render();

      const { getByTestId } = renderResult;
      // Find the items per page dropdown in the pagination controls
      const rowsPerPageButton = getByTestId('tablePaginationPopoverButton');
      userEvent.click(rowsPerPageButton);

      // Select a different page size (e.g., 20)
      waitFor(() => {
        const pageSize20Option = getByTestId('tablePagination-20-rows');
        userEvent.click(pageSize20Option);
        expect(history.location.search).toContain('pageSize=20');
      });
    });

    it('should update URL params when changing sort', () => {
      const scripts = scriptsGenerator.generateListOfScripts(Array.from({ length: 5 }));
      getScriptsListMock(scripts);

      render();

      const { getByText } = renderResult;
      waitFor(() => {
        const nameHeader = getByText('Name');
        userEvent.click(nameHeader);
        expect(history.location.search).toContain('sortField=name');
        expect(history.location.search).toContain('sortDirection=desc');
      });
    });
  });

  describe('Safe paging validation', () => {
    it('should ignore negative page and pageSize values', () => {
      act(() => history.push(`${SCRIPTS_LIBRARY_PATH}?page=-1&pageSize=-10`));
      render();

      // Should use page 1 instead of -1
      expect(useGetEndpointScriptsListMock).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 10,
        }),
        expect.any(Object)
      );
    });

    it('should ignore paging values greater than range', () => {
      act(() => history.push(`${SCRIPTS_LIBRARY_PATH}?page=1500&pageSize=1100`));
      render();

      // Should use page 1 instead of 1500
      expect(useGetEndpointScriptsListMock).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 10,
        }),
        expect.any(Object)
      );
    });
  });

  describe('Selected script matching', () => {
    it('should find and select matching script from API data based on URL param', () => {
      const scriptId = 'script-123';
      const script = scriptsGenerator.generate({ id: scriptId, name: 'Matching Script' });
      getScriptsListMock([script]);

      act(() => history.push(`${SCRIPTS_LIBRARY_PATH}?show=details&selectedScriptId=${scriptId}`));
      render();

      const { getByTestId } = renderResult;
      expect(getByTestId('test-endpointScriptFlyout-details')).toBeInTheDocument();
    });

    it('should handle selectedScriptId not found in API data', () => {
      const script = scriptsGenerator.generate({ id: 'script-1' });
      getScriptsListMock([script]);

      act(() =>
        history.push(`${SCRIPTS_LIBRARY_PATH}?show=details&selectedScriptId=non-existent-id`)
      );
      render();

      // Flyout should still render but without script data
      const { getByTestId } = renderResult;
      expect(getByTestId('test-endpointScriptFlyout-details')).toBeInTheDocument();
    });
  });

  describe('Table conditional rendering', () => {
    it('should NOT render table before isFetched is true', () => {
      (useGetEndpointScriptsListMock as jest.Mock).mockReturnValue({
        ...defaultMockGetScriptsResponse,
        isFetching: true,
        isFetched: false,
      });

      render();

      const { queryByTestId } = renderResult;
      expect(queryByTestId('test-table')).not.toBeInTheDocument();
    });

    it('should render table with loading state when isFetching is true', () => {
      const script = scriptsGenerator.generate();
      getScriptsListMock([script]);
      (useGetEndpointScriptsListMock as jest.Mock).mockReturnValue({
        ...defaultMockGetScriptsResponse,
        data: {
          data: [script],
          page: 1,
          pageSize: 10,
          sortDirection: 'asc',
          sortField: 'name',
          total: 1,
        },
        isFetching: true,
        isFetched: true,
      });

      render();

      const { getByTestId } = renderResult;
      expect(getByTestId('test-table')).toBeInTheDocument();
      // Table should have loading class
      expect(getByTestId('test-table')).toHaveClass('euiBasicTable-loading');
    });
  });

  describe('API privilege validation ', () => {
    it('should NOT call API when canReadScriptsLibrary is false', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canReadScriptsLibrary: false,
        },
      });

      render();

      // API should be called with enabled: false
      expect(useGetEndpointScriptsListMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('should call API when canReadScriptsLibrary is true', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canReadScriptsLibrary: true,
        },
      });

      render();

      // API should be called with enabled: true
      expect(useGetEndpointScriptsListMock).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          enabled: true,
        })
      );
    });
  });

  describe('Flyout close behavior', () => {
    beforeEach(() => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: true,
        },
      });
      act(() => history.push(`${SCRIPTS_LIBRARY_PATH}?show=create`));
      render();
    });

    it('should clear URL params when closing flyout without changes', () => {
      const { getByTestId } = renderResult;
      expect(getByTestId('test-endpointScriptFlyout-create')).toBeInTheDocument();

      waitFor(() => {
        // Close flyout (assuming close button exists)
        const cancelButton = getByTestId('test-endpointScriptFlyout-create-footer-cancel-button');
        userEvent.click(cancelButton);

        expect(history.location.search).not.toContain('?show=create');
      });
    });

    it('should show discard changes modal when closing flyout with unsaved changes', () => {
      const { getByTestId } = renderResult;
      expect(getByTestId('test-endpointScriptFlyout-create')).toBeInTheDocument();

      // make some changes
      const nameInput = getByTestId('test-endpointScriptFlyout-create-form-name-input');
      userEvent.type(nameInput, 'New Script Name');

      const cancelButton = getByTestId('test-endpointScriptFlyout-create-footer-cancel-button');
      userEvent.click(cancelButton);

      waitFor(() => {
        const discardModal = getByTestId('test-discard-changes-modal');
        expect(discardModal).toBeInTheDocument();

        const confirmButton = getByTestId('test-discard-changes-modal-confirm-button');
        userEvent.click(confirmButton);

        expect(history.location.search).not.toContain('?show=create');
      });
    });
  });
});
