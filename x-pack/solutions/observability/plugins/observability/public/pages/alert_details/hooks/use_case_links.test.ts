/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { renderHook, waitFor } from '@testing-library/react';
import type { Cases } from '@kbn/cases-plugin/common';
import { CaseSeverity, ConnectorTypes } from '@kbn/cases-plugin/common';
import { CaseStatuses } from '@kbn/cases-components';
import { useCaseLinks } from './use_case_links';
import { useKibana } from '../../../utils/kibana_react';
import { casesDetailLocatorID, casesOverviewLocatorID } from '../../../../common';

jest.mock('../../../utils/kibana_react');

const mockShare = {
  url: {
    locators: {
      get: jest.fn(),
    },
  },
};

const mockHttp: jest.Mocked<HttpStart> = {
  // @ts-expect-error partial implementation for testing
  basePath: {
    serverBasePath: '/mock-base-path',
    get: jest.fn(),
    prepend: jest.fn(),
    remove: jest.fn(),
  },
};

const unsubscribeMock = jest.fn();
const subscribeMock = jest.fn().mockReturnValue({ unsubscribe: unsubscribeMock });

const mockSpaces = {
  getActiveSpace$: jest.fn().mockReturnValue({
    subscribe: subscribeMock,
    pipe: () => ({
      subscribe: subscribeMock,
    }),
  }),
};

const mockKibana = {
  services: {
    share: mockShare,
    http: mockHttp,
    spaces: mockSpaces,
  },
};
const mockDetailLocation = {
  path: '/mock-path',
};
const mockOverviewLocation = {
  path: '/mock-overview-path',
};

// @ts-expect-error partial implementation for testing`k
const mockCase: Cases[0] = {
  id: 'case-1',
  title: 'Test Case',
  description: 'Test description',
  status: CaseStatuses.open,
  tags: ['tag1'],
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: {
    username: 'test-user',
    full_name: 'Test User',
    email: 'test@example.com',
  },
  updated_at: '2024-01-01T00:00:00.000Z',
  updated_by: {
    username: 'test-user',
    full_name: 'Test User',
    email: 'test@example.com',
  },
  owner: 'observability',
  connector: {
    id: 'connector-1',
    name: 'Test Connector',
    type: ConnectorTypes.casesWebhook,
    fields: null,
  },
  assignees: [],
  category: 'general',
  comments: [],
  customFields: [],
  external_service: null,
  totalAlerts: 0,
  settings: {
    syncAlerts: true,
    extractObservables: false,
  },
  observables: [],
  severity: CaseSeverity.LOW,
};

beforeEach(() => {
  jest.clearAllMocks();
  (useKibana as jest.Mock).mockReturnValue(mockKibana);
});

describe('useCaseLinks', () => {
  it('returns null links when no cases are provided', async () => {
    const { result, unmount } = renderHook(() => useCaseLinks());

    expect(result.current.firstCaseLink).toBeNull();
    expect(result.current.casesOverviewLink).toBeNull();

    unmount();

    expect(subscribeMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('returns null links when cases array is empty', async () => {
    const { result, unmount } = renderHook(() => useCaseLinks([]));

    expect(result.current.firstCaseLink).toBeNull();
    expect(result.current.casesOverviewLink).toBeNull();

    unmount();

    expect(subscribeMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('generates links when at least one case is provided', async () => {
    mockShare.url.locators.get.mockImplementation((id) => {
      if (id === casesOverviewLocatorID) {
        return {
          getLocation: jest.fn().mockResolvedValue(mockOverviewLocation),
        };
      } else if (id === casesDetailLocatorID) {
        return {
          getLocation: jest.fn().mockResolvedValue(mockDetailLocation),
        };
      }
      return null;
    });

    const { result, unmount } = renderHook(() => useCaseLinks([mockCase]));

    expect(mockShare.url.locators.get).toHaveBeenCalledWith(casesDetailLocatorID);
    expect(mockShare.url.locators.get).toHaveBeenCalledWith(casesOverviewLocatorID);
    await waitFor(() => {
      expect(result.current.firstCaseLink).toBe('/mock-path');
      expect(result.current.casesOverviewLink).toBe('/mock-overview-path');
    });

    unmount();

    expect(subscribeMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('provides the space id when active space is not default', async () => {
    const overviewGetLocation = jest.fn().mockResolvedValue(mockOverviewLocation);
    const detailGetLocation = jest.fn().mockResolvedValue(mockDetailLocation);
    mockShare.url.locators.get.mockImplementation((id) => {
      if (id === casesOverviewLocatorID) {
        return {
          getLocation: overviewGetLocation,
        };
      } else if (id === casesDetailLocatorID) {
        return {
          getLocation: detailGetLocation,
        };
      }
      return null;
    });
    const mockSubscribe = jest
      .fn()
      .mockImplementation((cb: (space: { id: string }) => { unsubscribe: () => unknown }) => {
        cb({ id: 'mock-space-id' });
        return { unsubscribe: unsubscribeMock };
      });
    mockSpaces.getActiveSpace$.mockReturnValue({
      subscribe: mockSubscribe,
    });

    const { result, unmount } = renderHook(() => useCaseLinks([mockCase]));

    expect(mockShare.url.locators.get).toHaveBeenCalledWith(casesDetailLocatorID);
    expect(mockShare.url.locators.get).toHaveBeenCalledWith(casesOverviewLocatorID);
    await waitFor(() => {
      expect(result.current.firstCaseLink).toBe('/mock-path');
      expect(result.current.casesOverviewLink).toBe('/mock-overview-path');
    });
    expect(overviewGetLocation).toHaveBeenCalledWith({
      basePath: '/mock-base-path',
      spaceId: 'mock-space-id',
    });
    expect(detailGetLocation).toHaveBeenCalledWith({
      basePath: '/mock-base-path',
      spaceId: 'mock-space-id',
      caseId: 'case-1',
    });

    unmount();

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('does not pass a space ID if the active space is the default space', async () => {
    const overviewGetLocation = jest.fn().mockResolvedValue(mockOverviewLocation);
    const detailGetLocation = jest.fn().mockResolvedValue(mockDetailLocation);
    mockShare.url.locators.get.mockImplementation((id) => {
      if (id === casesOverviewLocatorID) {
        return {
          getLocation: overviewGetLocation,
        };
      } else if (id === casesDetailLocatorID) {
        return {
          getLocation: detailGetLocation,
        };
      }
      return null;
    });
    const mockSubscribe = jest
      .fn()
      .mockImplementation((cb: (space: { id: string }) => { unsubscribe: () => unknown }) => {
        cb({ id: 'default' });
        return { unsubscribe: unsubscribeMock };
      });
    mockSpaces.getActiveSpace$.mockReturnValue({
      subscribe: mockSubscribe,
    });

    const { result, unmount } = renderHook(() => useCaseLinks([mockCase]));

    expect(mockShare.url.locators.get).toHaveBeenCalledWith(casesDetailLocatorID);
    expect(mockShare.url.locators.get).toHaveBeenCalledWith(casesOverviewLocatorID);
    await waitFor(() => {
      expect(result.current.firstCaseLink).toBe('/mock-path');
      expect(result.current.casesOverviewLink).toBe('/mock-overview-path');
    });
    expect(overviewGetLocation).toHaveBeenCalledWith({
      basePath: '/mock-base-path',
      spaceId: undefined,
    });
    expect(detailGetLocation).toHaveBeenCalledWith({
      basePath: '/mock-base-path',
      spaceId: undefined,
      caseId: 'case-1',
    });

    unmount();

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
