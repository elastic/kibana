/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CreateDefaultDataViewDependencies,
  createDefaultDataView,
} from './create_default_data_view';
import { initDataView } from '../../sourcerer/store/model';
import * as helpersAccess from '../../helpers_access';
import * as createSourcererDataViewModule from '../../sourcerer/containers/create_sourcerer_data_view';
import {
  DEFAULT_ALERT_DATA_VIEW_ID,
  DEFAULT_DATA_VIEW_ID,
  DETECTION_ENGINE_INDEX_URL,
} from '../../../common/constants';

jest.mock('../../helpers_access');
jest.mock('../../sourcerer/containers/create_sourcerer_data_view');

const mockUiSettings = {
  get: jest.fn(),
};

const mockDataViewService = {};

const mockSpaces = {
  getActiveSpace: jest.fn(),
};

const mockHttp = {
  fetch: jest.fn(),
};

const mockApplication = {
  capabilities: {},
};

const defaultDeps = {
  http: mockHttp,
  application: mockApplication,
  uiSettings: mockUiSettings,
  dataViewService: mockDataViewService,
  spaces: mockSpaces,
} as unknown as CreateDefaultDataViewDependencies;

describe('createDefaultDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUiSettings.get.mockReturnValue(['pattern-*']);
    mockSpaces.getActiveSpace.mockResolvedValue({ id: 'space1' });
    (helpersAccess.hasAccessToSecuritySolution as jest.Mock).mockReturnValue(true);
    mockHttp.fetch.mockResolvedValue({ name: 'signal-index', index_mapping_outdated: false });
    (createSourcererDataViewModule.createSourcererDataView as jest.Mock).mockResolvedValue({
      defaultDataView: { id: 'dv1', title: 'title1' },
      alertDataView: { id: 'dv2', title: 'title2' },
      kibanaDataViews: [{ id: 'dv1', title: 'title1' }],
    });
  });

  it('returns default values if skip is true', async () => {
    const result = await createDefaultDataView({ ...defaultDeps, skip: true });
    expect(result.kibanaDataViews).toEqual([]);
    expect(result.defaultDataView).toEqual(initDataView);
    expect(result.signal).toEqual({ name: null, index_mapping_outdated: null });
  });

  it('fetches signal index and creates data views when user has access', async () => {
    const result = await createDefaultDataView(defaultDeps);
    expect(helpersAccess.hasAccessToSecuritySolution).toHaveBeenCalledWith(
      mockApplication.capabilities
    );
    expect(mockHttp.fetch).toHaveBeenCalledWith(DETECTION_ENGINE_INDEX_URL, expect.any(Object));
    expect(createSourcererDataViewModule.createSourcererDataView).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { patternList: ['pattern-*', 'signal-index'] },
        dataViewService: mockDataViewService,
        dataViewId: `${DEFAULT_DATA_VIEW_ID}-space1`,
        alertDataViewId: `${DEFAULT_ALERT_DATA_VIEW_ID}-space1`,
        signalIndexName: 'signal-index',
      })
    );
    expect(result.defaultDataView).toMatchObject({ id: 'dv1', title: 'title1' });
    expect(result.alertDataView).toMatchObject({ id: 'dv2', title: 'title2' });
    expect(result.kibanaDataViews[0]).toMatchObject({ id: 'dv1', title: 'title1' });
    expect(result.signal).toEqual({ name: 'signal-index', index_mapping_outdated: false });
  });

  it('does not fetch signal index if user has no access', async () => {
    (helpersAccess.hasAccessToSecuritySolution as jest.Mock).mockReturnValue(false);
    const result = await createDefaultDataView(defaultDeps);
    expect(mockHttp.fetch).not.toHaveBeenCalled();
    expect(result.signal).toEqual({ name: null, index_mapping_outdated: null });
  });

  it('returns error in defaultDataView if an exception is thrown', async () => {
    (createSourcererDataViewModule.createSourcererDataView as jest.Mock).mockImplementation(() => {
      throw new Error('fail');
    });
    const result = await createDefaultDataView(defaultDeps);
    expect(result.defaultDataView.error).toBeInstanceOf(Error);
    expect(result.kibanaDataViews).toEqual([]);
  });
});
