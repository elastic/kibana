/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, HttpSetup } from '@kbn/core/public';
import type { Store } from 'redux';
import { applyMiddleware, createStore } from 'redux';
import { coreMock } from '@kbn/core/public/mocks';
import type { History } from 'history';
import { createBrowserHistory } from 'history';
import type { DepsStartMock } from '../../../../common/mock/endpoint';
import { depsStartMock } from '../../../../common/mock/endpoint';
import type { MiddlewareActionSpyHelper } from '../../../../common/store/test_utils';
import { createSpyMiddleware } from '../../../../common/store/test_utils';
import type {
  HostIsolationResponse,
  Immutable,
  ISOLATION_ACTIONS,
  MetadataListResponse,
} from '../../../../../common/endpoint/types';
import type { AppAction } from '../../../../common/store/actions';
import { mockEndpointResultList } from './mock_endpoint_result_list';
import { listData } from './selectors';
import type { EndpointState, TransformStats } from '../types';
import { endpointListReducer } from './reducer';
import { endpointMiddlewareFactory } from './middleware';
import { getEndpointListPath } from '../../../common/routing';
import type { FailedResourceState, LoadedResourceState } from '../../../state';
import {
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
} from '../../../state';
import { KibanaServices } from '../../../../common/lib/kibana';
import {
  hostIsolationHttpMocks,
  hostIsolationRequestBodyMock,
  hostIsolationResponseMock,
} from '../../../../common/lib/endpoint/endpoint_isolation/mocks';
import { endpointPageHttpMock, failedTransformStateMock } from '../mocks';
import { HOST_METADATA_LIST_ROUTE } from '../../../../../common/endpoint/constants';
import { INGEST_API_PACKAGE_POLICIES } from '../../../services/policies/ingest';
import { canFetchPackageAndAgentPolicies } from '../../../../../common/endpoint/service/authz/authz';

const mockSendBulkGetPackagePolicies = jest.fn();
jest.mock('../../../services/policies/ingest', () => ({
  sendGetAgentConfigList: () => Promise.resolve({ items: [] }),
  sendGetAgentPolicyList: () => Promise.resolve({ items: [] }),
  sendBulkGetPackagePolicies: () => mockSendBulkGetPackagePolicies(),
  sendGetEndpointSecurityPackage: () => Promise.resolve({ version: '1.1.1' }),
}));

jest.mock('../../../../common/lib/kibana');
const mockFirstValueFrom = jest.fn();
jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  firstValueFrom: () => mockFirstValueFrom(),
}));

jest.mock('../../../../../common/endpoint/service/authz/authz', () => ({
  ...jest.requireActual('../../../../../common/endpoint/service/authz/authz'),
  canFetchPackageAndAgentPolicies: jest.fn(),
}));
const canFetchAgentPoliciesMock = canFetchPackageAndAgentPolicies as jest.Mock;

type EndpointListStore = Store<Immutable<EndpointState>, Immutable<AppAction>>;

describe('endpoint list middleware', () => {
  const getKibanaServicesMock = KibanaServices.get as jest.Mock;
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let depsStart: DepsStartMock;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let store: EndpointListStore;
  let getState: EndpointListStore['getState'];
  let dispatch: EndpointListStore['dispatch'];
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let actionSpyMiddleware;
  let history: History<never>;

  const getEndpointListApiResponse = (
    options: Partial<Parameters<typeof mockEndpointResultList>[0]> = {}
  ): MetadataListResponse => {
    return mockEndpointResultList({ pageSize: 1, page: 0, total: 10, ...options });
  };

  const dispatchUserChangedUrlToEndpointList = (locationOverrides: Partial<Location> = {}) => {
    dispatch({
      type: 'userChangedUrl',
      payload: {
        ...history.location,
        pathname: getEndpointListPath({ name: 'endpointList' }),
        ...locationOverrides,
      },
    });
  };

  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    depsStart = depsStartMock();
    fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
    ({ actionSpyMiddleware, waitForAction } = createSpyMiddleware<EndpointState>());
    store = createStore(
      endpointListReducer,
      applyMiddleware(endpointMiddlewareFactory(fakeCoreStart, depsStart), actionSpyMiddleware)
    );
    getState = store.getState;
    dispatch = store.dispatch;
    history = createBrowserHistory();
    getKibanaServicesMock.mockReturnValue(fakeCoreStart);
    canFetchAgentPoliciesMock.mockReturnValue(false);
    mockSendBulkGetPackagePolicies.mockResolvedValue({ items: [] });
  });

  describe('handles `userChangedUrl`', () => {
    describe('when there are hosts', () => {
      let apiResponse: MetadataListResponse;

      beforeEach(() => {
        endpointPageHttpMock(fakeHttpServices);
        apiResponse = getEndpointListApiResponse();
        fakeHttpServices.get.mockResolvedValue(apiResponse);
      });

      it('should not fetch agent policies if there are hosts', async () => {
        dispatchUserChangedUrlToEndpointList();

        await Promise.all([
          waitForAction('serverReturnedEndpointList'),
          waitForAction('serverReturnedEndpointExistValue', {
            validate: ({ payload }) => payload === true,
          }),
          waitForAction('serverCancelledPolicyItemsLoading'),
        ]);
        expect(fakeHttpServices.get).toHaveBeenNthCalledWith(1, HOST_METADATA_LIST_ROUTE, {
          query: {
            page: '0',
            pageSize: '10',
            kuery: '',
          },
          version: '2023-10-31',
        });
        expect(listData(getState())).toEqual(apiResponse.data);
        expect(fakeHttpServices.get).not.toHaveBeenCalledWith(
          INGEST_API_PACKAGE_POLICIES,
          expect.objectContaining({})
        );
      });

      describe('fetching non-existing policies', () => {
        it('should not fetch package policies without required privileges', async () => {
          canFetchAgentPoliciesMock.mockReturnValue(false);

          dispatchUserChangedUrlToEndpointList();

          await waitForAction('serverFinishedInitialization');
          expect(mockSendBulkGetPackagePolicies).not.toBeCalled();
        });

        it('should fetch package policies with required privileges', async () => {
          canFetchAgentPoliciesMock.mockReturnValue(true);

          dispatchUserChangedUrlToEndpointList();

          await Promise.all([
            waitForAction('serverFinishedInitialization'),
            waitForAction('serverReturnedEndpointNonExistingPolicies'),
          ]);
          expect(mockSendBulkGetPackagePolicies).toBeCalled();
        });
      });
    });

    describe('when there are no hosts', () => {
      beforeEach(() => {
        endpointPageHttpMock(fakeHttpServices);
        const apiResponse = getEndpointListApiResponse({ total: 0 });
        fakeHttpServices.get.mockResolvedValue(apiResponse);
      });

      it('should NOT fetch agent policies without required privileges', async () => {
        canFetchAgentPoliciesMock.mockReturnValue(false);

        dispatchUserChangedUrlToEndpointList();

        await Promise.all([
          waitForAction('serverReturnedEndpointList'),
          waitForAction('serverReturnedEndpointExistValue', {
            validate: ({ payload }) => payload === false,
          }),
          waitForAction('serverCancelledPolicyItemsLoading'),
        ]);
        expect(fakeHttpServices.get).not.toHaveBeenCalledWith(
          INGEST_API_PACKAGE_POLICIES,
          expect.objectContaining({})
        );
      });

      it('should fetch agent policies with required privileges', async () => {
        canFetchAgentPoliciesMock.mockReturnValue(true);

        dispatchUserChangedUrlToEndpointList();

        await Promise.all([
          waitForAction('serverReturnedEndpointList'),
          waitForAction('serverReturnedEndpointExistValue', {
            validate: ({ payload }) => payload === false,
          }),
          waitForAction('serverReturnedPoliciesForOnboarding'),
        ]);
        expect(fakeHttpServices.get).toHaveBeenCalledWith(
          INGEST_API_PACKAGE_POLICIES,
          expect.objectContaining({})
        );
      });
    });
  });

  it('handles `appRequestedEndpointList`', async () => {
    mockFirstValueFrom.mockResolvedValue({ indexFields: [] });
    endpointPageHttpMock(fakeHttpServices);
    const apiResponse = getEndpointListApiResponse();
    fakeHttpServices.get.mockResolvedValue(apiResponse);
    expect(fakeHttpServices.get).not.toHaveBeenCalled();

    // First change the URL
    dispatchUserChangedUrlToEndpointList();
    await waitForAction('serverReturnedEndpointList');

    // Then request the Endpoint List
    dispatch({
      type: 'appRequestedEndpointList',
    });

    await Promise.all([
      waitForAction('serverReturnedEndpointList'),
      waitForAction('serverReturnedMetadataPatterns'),
      waitForAction('serverCancelledPolicyItemsLoading'),
      waitForAction('serverReturnedEndpointExistValue'),
    ]);

    expect(fakeHttpServices.get).toHaveBeenNthCalledWith(1, HOST_METADATA_LIST_ROUTE, {
      query: {
        page: '0',
        pageSize: '10',
        kuery: '',
      },
      version: '2023-10-31',
    });
    expect(listData(getState())).toEqual(apiResponse.data);
  });

  describe('handling of IsolateEndpointHost action', () => {
    const dispatchIsolateEndpointHost = (action: ISOLATION_ACTIONS = 'isolate') => {
      dispatch({
        type: 'endpointIsolationRequest',
        payload: {
          type: action,
          data: hostIsolationRequestBodyMock(),
        },
      });
    };
    let isolateApiResponseHandlers: ReturnType<typeof hostIsolationHttpMocks>;

    beforeEach(() => {
      isolateApiResponseHandlers = hostIsolationHttpMocks(fakeHttpServices);
    });

    it('should set Isolation state to loading', async () => {
      const loadingDispatched = waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isLoadingResourceState(action.payload);
        },
      });

      dispatchIsolateEndpointHost();
      expect(await loadingDispatched).not.toBeFalsy();
    });

    it('should call isolate api', async () => {
      dispatchIsolateEndpointHost();
      await waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      expect(isolateApiResponseHandlers.responseProvider.isolateHost).toHaveBeenCalled();
    });

    it('should call unisolate api', async () => {
      dispatchIsolateEndpointHost('unisolate');
      await waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      expect(isolateApiResponseHandlers.responseProvider.unIsolateHost).toHaveBeenCalled();
    });

    it('should set Isolation state to loaded if api is successful', async () => {
      const loadedDispatched = waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      dispatchIsolateEndpointHost();
      expect(
        ((await loadedDispatched).payload as LoadedResourceState<HostIsolationResponse>).data
      ).toEqual(hostIsolationResponseMock());
    });

    it('should set Isolation to Failed if api failed', async () => {
      const apiError = new Error('oh oh');
      const failedDispatched = waitForAction('endpointIsolationRequestStateChange', {
        validate(action) {
          return isFailedResourceState(action.payload);
        },
      });

      isolateApiResponseHandlers.responseProvider.isolateHost.mockImplementation(() => {
        throw apiError;
      });
      dispatchIsolateEndpointHost();

      const failedAction = (await failedDispatched)
        .payload as FailedResourceState<HostIsolationResponse>;
      expect(failedAction.error).toBe(apiError);
    });
  });

  describe('handles metadata transform stats actions', () => {
    const dispatchLoadTransformStats = () => {
      dispatch({
        type: 'loadMetadataTransformStats',
      });
    };

    let mockedApis: ReturnType<typeof endpointPageHttpMock>;

    beforeEach(() => {
      mockedApis = endpointPageHttpMock(fakeHttpServices);
    });

    it('correctly fetches stats', async () => {
      const loadedDispatched = waitForAction('metadataTransformStatsChanged', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      dispatchLoadTransformStats();
      await loadedDispatched;
      expect(mockedApis.responseProvider.metadataTransformStats).toHaveBeenCalled();
    });

    it('correctly sets loading', async () => {
      const loadingDispatched = waitForAction('metadataTransformStatsChanged', {
        validate(action) {
          return isLoadingResourceState(action.payload);
        },
      });

      dispatchLoadTransformStats();
      expect(await loadingDispatched).toBeTruthy();
    });

    it('correctly sets loaded state on success', async () => {
      const loadedDispatched = waitForAction('metadataTransformStatsChanged', {
        validate(action) {
          return isLoadedResourceState(action.payload);
        },
      });

      dispatchLoadTransformStats();
      const action = await loadedDispatched;
      const { data } = action.payload as LoadedResourceState<TransformStats[]>;
      expect(data).toEqual(failedTransformStateMock.transforms);
    });

    it('correctly sets failed state on api failure', async () => {
      const failedDispatched = waitForAction('metadataTransformStatsChanged', {
        validate(action) {
          return isFailedResourceState(action.payload);
        },
      });

      const apiError = new Error('hey look an error');
      mockedApis.responseProvider.metadataTransformStats.mockImplementation(() => {
        throw apiError;
      });

      dispatchLoadTransformStats();

      const failedAction = (await failedDispatched).payload as FailedResourceState<
        TransformStats[]
      >;
      expect(failedAction.error).toBe(apiError);
    });
  });
});
