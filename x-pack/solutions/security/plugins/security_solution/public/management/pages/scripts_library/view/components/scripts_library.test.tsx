/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react';

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

    render = () => {
      renderResult = mockedContext.render(<ScriptsLibrary data-test-subj="test" />);
      return renderResult;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Page elements', () => {
    it('renders the Scripts Library page', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));

      render();
      const { getByTestId } = renderResult;

      expect(getByTestId('test')).toBeInTheDocument();
    });

    it('should show the page header', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));

      render();
      const { getByTestId } = renderResult;

      expect(getByTestId('test-header')).toBeInTheDocument();
      expect(getByTestId('header-page-title').textContent).toEqual('Scripts Library');
      expect(getByTestId('header-panel-subtitle').textContent).toEqual(
        'View and manage scripts to upload and execute on Elastic Defend agents.'
      );
    });

    it('should not show the upload button when user does not have `canWriteScriptsLibrary` privileges', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: false,
        },
      });

      act(() => history.push(SCRIPTS_LIBRARY_PATH));

      render();
      const { queryByTestId } = renderResult;
      const uploadButton = queryByTestId('test-uploadScriptButton');

      expect(uploadButton).not.toBeInTheDocument();
    });

    it('should show an empty table when there are no scripts', () => {
      act(() => history.push(SCRIPTS_LIBRARY_PATH));

      render();
      const { getByText, getByTestId } = renderResult;

      expect(getByTestId('test-table')).toBeInTheDocument();
      expect(getByTestId('test-table-record-range-label').textContent).toEqual(
        'Showing 1-10 of 0 scripts'
      );
      expect(getByText('No scripts found')).toBeInTheDocument();
    });
  });

  describe('Interactions (with data)', () => {
    const setupScriptsList = (
      scriptsList: ReturnType<EndpointScriptsGenerator['generateListOfScripts']>
    ) => {
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

    it('should show an error message when there is an error with fetching scripts', async () => {
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

      act(() => history.push(SCRIPTS_LIBRARY_PATH));

      render();
      expect(useToastsMock().addDanger).toHaveBeenCalledWith(
        'There was an error fetching the scripts list: fetch failed!'
      );
    });

    it('should show details flyout when clicked on row action `View details` item', () => {
      const scriptId = 'script-1';
      const script = scriptsGenerator.generate({ id: scriptId });
      setupScriptsList([script]);

      act(() => history.push(SCRIPTS_LIBRARY_PATH));
      render();

      const { getByTestId } = renderResult;
      const range = getByTestId('test-table-record-range-label');
      expect(range).toHaveTextContent(`Showing 1-1 of 1 script`);

      const actionsButton = getByTestId(`test-table-row-actions-${scriptId}`);
      expect(actionsButton).toBeInTheDocument();
      fireEvent.click(actionsButton);

      waitFor(() => {
        const actionsPanel = getByTestId(`test-table-row-actions-${scriptId}-contextMenuPanel`);
        expect(actionsPanel).toBeInTheDocument();

        const detailsButton = getByTestId('actionDetails');
        expect(detailsButton).toBeInTheDocument();
        fireEvent.click(detailsButton);
        expect(getByTestId('test-endpointScriptFlyout-details')).toBeInTheDocument();
      });
    });
  });
});
