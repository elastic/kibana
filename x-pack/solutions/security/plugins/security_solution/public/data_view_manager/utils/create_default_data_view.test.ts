/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createDefaultDataView,
  type CreateDefaultDataViewDependencies,
} from './create_default_data_view';
import { initDataView } from '../../sourcerer/store/model';
import * as helpersAccess from '../../helpers_access';
import * as initializationApi from '../../common/components/initialization/api';
import {
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../common/api/initialization';

jest.mock('../../helpers_access');
jest.mock('../../common/components/initialization/api');

const mockHttp = {};

const mockApplication = {
  capabilities: {},
};

const defaultDeps: CreateDefaultDataViewDependencies = {
  http: mockHttp as CreateDefaultDataViewDependencies['http'],
  application: mockApplication as CreateDefaultDataViewDependencies['application'],
};

const mockPayload = {
  defaultDataView: { id: 'dv-default', title: 'default-title', patternList: ['logs-*'] },
  alertDataView: { id: 'dv-alert', title: 'alert-title', patternList: ['.alerts-*'] },
  kibanaDataViews: [{ id: 'dv-default', title: 'default-title', patternList: ['logs-*'] }],
  signalIndexName: '.siem-signals-default',
};

describe('createDefaultDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (helpersAccess.hasAccessToSecuritySolution as jest.Mock).mockReturnValue(true);
    (initializationApi.initializeSecuritySolution as jest.Mock).mockResolvedValue({
      flows: {
        [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]: {
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: mockPayload,
        },
      },
    });
  });

  it('returns default values when skip=true without calling the API', async () => {
    const result = await createDefaultDataView({ ...defaultDeps, skip: true });

    expect(initializationApi.initializeSecuritySolution).not.toHaveBeenCalled();
    expect(result.defaultDataView).toEqual(initDataView);
    expect(result.kibanaDataViews).toEqual([]);
    expect(result.signal).toEqual({ name: null, index_mapping_outdated: null });
  });

  it('calls the initialization endpoint with security-data-views flow', async () => {
    await createDefaultDataView(defaultDeps);

    expect(initializationApi.initializeSecuritySolution).toHaveBeenCalledWith({
      http: mockHttp,
      flows: [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS],
    });
  });

  it('maps the payload into sourcerer model shape on success', async () => {
    const result = await createDefaultDataView(defaultDeps);

    expect(result.defaultDataView).toMatchObject(mockPayload.defaultDataView);
    expect(result.alertDataView).toMatchObject(mockPayload.alertDataView);
    expect(result.kibanaDataViews[0]).toMatchObject(mockPayload.kibanaDataViews[0]);
    expect(result.signal).toEqual({ name: '.siem-signals-default', index_mapping_outdated: null });
  });

  it('includes attackDataView in the result when the payload contains it', async () => {
    const attackDataView = { id: 'dv-attack', title: 'attack-title', patternList: ['.attack-*'] };
    (initializationApi.initializeSecuritySolution as jest.Mock).mockResolvedValue({
      flows: {
        [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]: {
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: { ...mockPayload, attackDataView },
        },
      },
    });

    const result = await createDefaultDataView(defaultDeps);

    expect(result.attackDataView).toMatchObject(attackDataView);
  });

  it('does not call the API when the user has no access to Security Solution', async () => {
    (helpersAccess.hasAccessToSecuritySolution as jest.Mock).mockReturnValue(false);

    const result = await createDefaultDataView(defaultDeps);

    expect(initializationApi.initializeSecuritySolution).not.toHaveBeenCalled();
    expect(result.defaultDataView.error).toBeDefined();
    expect(result.kibanaDataViews).toEqual([]);
  });

  it('sets error on all data views when the flow returns status=error', async () => {
    (initializationApi.initializeSecuritySolution as jest.Mock).mockResolvedValue({
      flows: {
        [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]: {
          status: INITIALIZATION_FLOW_STATUS_ERROR,
          error: 'initialization failed',
        },
      },
    });

    const result = await createDefaultDataView(defaultDeps);

    expect(result.defaultDataView.error).toBeDefined();
    expect(result.kibanaDataViews).toEqual([]);
  });

  it('sets error on all data views when the API call throws', async () => {
    (initializationApi.initializeSecuritySolution as jest.Mock).mockRejectedValue(
      new Error('network error')
    );

    const result = await createDefaultDataView(defaultDeps);

    expect(result.defaultDataView.error).toBeInstanceOf(Error);
    expect(result.kibanaDataViews).toEqual([]);
  });
});
