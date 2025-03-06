/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';

import { KibanaLogic } from '../../../shared/kibana';
import { DeleteSearchApplicationApiLogicResponse } from '../../api/search_applications/delete_search_application_api_logic';
import { SEARCH_APPLICATIONS_PATH } from '../../routes';
import { SearchApplicationsListLogic } from '../search_applications/search_applications_list_logic';

import {
  SearchApplicationViewLogic,
  SearchApplicationViewValues,
} from './search_application_view_logic';

const DEFAULT_VALUES: SearchApplicationViewValues = {
  fetchSearchApplicationApiError: undefined,
  fetchSearchApplicationApiStatus: Status.IDLE,
  fetchSearchApplicationSchemaApiError: undefined,
  fetchSearchApplicationSchemaApiStatus: Status.IDLE,
  hasSchemaConflicts: false,
  isDeleteModalVisible: false,
  isLoadingSearchApplication: true,
  isLoadingSearchApplicationSchema: true,
  schemaFields: [],
  searchApplicationData: undefined,
  searchApplicationName: 'my-test-search-application',
  searchApplicationSchemaData: undefined,
};

describe('SearchApplicationViewLogic', () => {
  const { mount } = new LogicMounter(SearchApplicationViewLogic);
  const { mount: mountSearchApplicationsListLogic } = new LogicMounter(SearchApplicationsListLogic);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mountSearchApplicationsListLogic();
    mount(
      { searchApplicationName: DEFAULT_VALUES.searchApplicationName },
      { searchApplicationName: DEFAULT_VALUES.searchApplicationName }
    );
  });

  it('has expected default values', () => {
    expect(SearchApplicationViewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('listeners', () => {
    describe('deleteSuccess', () => {
      it('should navigate to the search applications list when an search application is deleted', () => {
        jest.spyOn(SearchApplicationViewLogic.actions, 'deleteSuccess');
        jest
          .spyOn(KibanaLogic.values, 'navigateToUrl')
          .mockImplementationOnce(() => Promise.resolve());
        SearchApplicationsListLogic.actions.deleteSuccess(
          {} as DeleteSearchApplicationApiLogicResponse
        );

        expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith(SEARCH_APPLICATIONS_PATH);
      });
    });
  });
});
