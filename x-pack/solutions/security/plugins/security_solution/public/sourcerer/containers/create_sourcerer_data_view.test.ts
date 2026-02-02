/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSourcererDataView } from './create_sourcerer_data_view';
import { DEFAULT_TIME_FIELD } from '../../../common/constants';
import {
  DEFAULT_SECURITY_ALERT_DATA_VIEW,
  DEFAULT_SECURITY_ATTACK_DATA_VIEW,
  DEFAULT_SECURITY_DATA_VIEW,
} from '../../data_view_manager/components/data_view_picker/translations';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';

describe('createSourcererDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null if dataViewId is null', async () => {
    const result = await createSourcererDataView({
      dataViewService: {} as unknown as jest.Mocked<DataViewsServicePublic>,
      defaultDetails: { dataViewId: null, patternList: [] },
      alertDetails: {},
      attackDetails: {},
    });

    expect(result).toEqual(undefined);
  });

  describe('default data view', () => {
    it('should create new default data view if it does not exist', async () => {
      const patternList = ['index1', 'index2'];

      const mockCreateAndSave = jest.fn();
      const dataViewService = {
        getIdsWithTitle: jest.fn().mockReturnValue([]),
        createAndSave: mockCreateAndSave.mockReturnValue({
          id: 'siemDataViewId',
          title: 'index1,index2',
        }),
        getExistingIndices: jest.fn().mockReturnValue(['index3', 'index4']),
      } as unknown as jest.Mocked<DataViewsServicePublic>;

      const result = await createSourcererDataView({
        dataViewService,
        defaultDetails: { dataViewId: 'dataViewId', patternList },
        alertDetails: {},
      });

      expect(mockCreateAndSave).toHaveBeenCalledWith(
        {
          allowNoIndex: true,
          id: 'dataViewId',
          title: patternList.join(),
          timeFieldName: DEFAULT_TIME_FIELD,
          name: DEFAULT_SECURITY_DATA_VIEW,
        },
        true
      );
      expect(result).toEqual({
        defaultDataView: {
          id: 'siemDataViewId',
          patternList: ['index3', 'index4'],
          title: 'index1,index2',
        },
        kibanaDataViews: [
          {
            id: 'siemDataViewId',
            patternList: ['index1', 'index2'],
            title: 'index1,index2',
          },
        ],
        alertDataView: {
          id: '',
          patternList: [],
          title: '',
        },
      });
    });

    it('should update default data view if patterns are different', async () => {
      const patternList = ['index1', 'index2'];

      const mockUpdateSavedObject = jest.fn();
      const dataViewService = {
        getIdsWithTitle: jest.fn().mockReturnValue([
          {
            id: 'dataViewId',
            title: 'dataViewTitle',
            name: 'Security solution default',
          },
        ]),
        updateSavedObject: mockUpdateSavedObject,
        getExistingIndices: jest.fn().mockReturnValue(['index3', 'index4']),
        get: jest.fn().mockReturnValue({
          id: 'dataViewId',
          title: 'dataViewTitle',
        }),
      } as unknown as jest.Mocked<DataViewsServicePublic>;

      const result = await createSourcererDataView({
        dataViewService,
        defaultDetails: { dataViewId: 'dataViewId', patternList },
        alertDetails: {},
      });

      expect(mockUpdateSavedObject).toHaveBeenCalledWith({
        id: 'dataViewId',
        title: 'index1,index2',
      });
      expect(result).toEqual({
        defaultDataView: {
          id: 'dataViewId',
          patternList: ['index3', 'index4'],
          title: 'index1,index2',
        },
        kibanaDataViews: [
          {
            id: 'dataViewId',
            patternList: ['index3', 'index4'],
            title: 'index1,index2',
          },
        ],
        alertDataView: {
          id: '',
          patternList: [],
          title: '',
        },
      });
    });

    it('should update default data view if name is not Security solution default', async () => {
      const patternList = ['index1', 'index2'];

      const mockUpdateSavedObject = jest.fn();
      const dataViewService = {
        getIdsWithTitle: jest.fn().mockReturnValue([
          {
            id: 'dataViewId',
            title: 'index1,index2',
            name: 'old name',
          },
        ]),
        updateSavedObject: mockUpdateSavedObject,
        getExistingIndices: jest.fn().mockReturnValue(['index3', 'index4']),
        get: jest.fn().mockReturnValue({
          id: 'dataViewId',
          title: 'dataViewTitle',
        }),
      } as unknown as jest.Mocked<DataViewsServicePublic>;

      const result = await createSourcererDataView({
        dataViewService,
        defaultDetails: { dataViewId: 'dataViewId', patternList },
        alertDetails: {},
      });

      expect(mockUpdateSavedObject).toHaveBeenCalledWith({
        id: 'dataViewId',
        name: 'Security solution default',
        title: 'dataViewTitle',
      });
      expect(result).toEqual({
        defaultDataView: {
          id: 'dataViewId',
          patternList: ['index3', 'index4'],
          title: 'index1,index2',
        },
        kibanaDataViews: [
          {
            id: 'dataViewId',
            patternList: ['index3', 'index4'],
            title: 'index1,index2',
          },
        ],
        alertDataView: {
          id: '',
          patternList: [],
          title: '',
        },
      });
    });
  });

  describe('alerts data view', () => {
    it('should create new alerts data view if it does not exist', async () => {
      const patternList = ['index1', 'index2'];

      const mockCreateAndSave = jest.fn();
      const dataViewService = {
        getIdsWithTitle: jest.fn().mockReturnValue([
          {
            id: 'dataViewId',
            title: 'dataViewTitle',
          },
        ]),
        createAndSave: mockCreateAndSave.mockReturnValue({
          id: 'alertsDataViewId',
          title: 'index1,index2',
        }),
        getExistingIndices: jest.fn(),
        get: jest.fn().mockReturnValue({
          id: 'dataViewId',
          title: 'dataViewTitle',
        }),
        updateSavedObject: jest.fn(),
      } as unknown as jest.Mocked<DataViewsServicePublic>;

      const result = await createSourcererDataView({
        dataViewService,
        defaultDetails: { dataViewId: 'dataViewId', patternList },
        alertDetails: {
          dataViewId: 'alertDataViewId',
          indexName: 'signalIndexName',
        },
      });

      expect(mockCreateAndSave).toHaveBeenCalledWith(
        {
          allowNoIndex: true,
          id: 'alertDataViewId',
          title: 'signalIndexName',
          timeFieldName: DEFAULT_TIME_FIELD,
          name: DEFAULT_SECURITY_ALERT_DATA_VIEW,
          managed: true,
        },
        true
      );
      expect(result).toEqual({
        defaultDataView: {
          id: 'dataViewId',
          patternList: undefined,
          title: 'index1,index2',
        },
        kibanaDataViews: [
          {
            id: 'dataViewId',
            patternList: undefined,
            title: 'index1,index2',
          },
        ],
        alertDataView: {
          id: 'alertsDataViewId',
          patternList: ['index1', 'index2'],
          title: 'index1,index2',
        },
      });
    });

    it('should update alerts data view if name is not Security solution alerts', async () => {
      const patternList = ['index1', 'index2'];

      const mockUpdateSavedObject = jest.fn();
      const dataViewService = {
        getIdsWithTitle: jest.fn().mockReturnValue([
          {
            id: 'dataViewId',
            title: 'index1,index2',
          },
          {
            id: 'alertsDataViewId',
            title: 'index1,index2',
            name: 'old name',
          },
        ]),
        updateSavedObject: mockUpdateSavedObject,
        getExistingIndices: jest.fn(),
        get: jest.fn().mockReturnValue({
          id: 'alertsDataViewId',
          title: 'alertsDataViewTitle',
        }),
      } as unknown as jest.Mocked<DataViewsServicePublic>;

      const result = await createSourcererDataView({
        dataViewService,
        defaultDetails: { dataViewId: 'dataViewId', patternList },
        alertDetails: { dataViewId: 'alertsDataViewId' },
      });

      expect(mockUpdateSavedObject).toHaveBeenCalledWith({
        id: 'alertsDataViewId',
        name: 'Security solution alerts',
        title: 'alertsDataViewTitle',
      });
      expect(result).toEqual({
        defaultDataView: {
          id: 'dataViewId',
          patternList: undefined,
          title: 'index1,index2',
        },
        kibanaDataViews: [
          {
            id: 'dataViewId',
            patternList: undefined,
            title: 'index1,index2',
          },
          {
            id: 'alertsDataViewId',
            patternList: ['index1', 'index2'],
            title: 'index1,index2',
          },
        ],
        alertDataView: {
          id: 'alertsDataViewId',
          patternList: [],
          title: '',
        },
      });
    });
  });

  describe('attacks data view', () => {
    it('should create new attacks data view if it does not exist', async () => {
      const patternList = ['index1', 'index2'];

      const mockCreateAndSave = jest.fn();
      const dataViewService = {
        getIdsWithTitle: jest.fn().mockReturnValue([
          {
            id: 'dataViewId',
            title: 'dataViewTitle',
          },
        ]),
        createAndSave: mockCreateAndSave.mockReturnValue({
          id: 'attackDataViewId',
          title: 'index1,index2',
        }),
        getExistingIndices: jest.fn(),
        get: jest.fn().mockReturnValue({
          id: 'dataViewId',
          title: 'dataViewTitle',
        }),
        updateSavedObject: jest.fn(),
      } as unknown as jest.Mocked<DataViewsServicePublic>;

      const result = await createSourcererDataView({
        dataViewService,
        defaultDetails: { dataViewId: 'dataViewId', patternList },
        alertDetails: {},
        attackDetails: {
          dataViewId: 'attackDataViewId',
          patternList: ['attackIndexName', 'alertIndexName'],
        },
      });

      expect(mockCreateAndSave).toHaveBeenCalledWith(
        {
          allowNoIndex: true,
          id: 'attackDataViewId',
          title: 'alertIndexName,attackIndexName',
          timeFieldName: DEFAULT_TIME_FIELD,
          name: DEFAULT_SECURITY_ATTACK_DATA_VIEW,
          managed: true,
        },
        true
      );
      expect(result).toEqual({
        defaultDataView: {
          id: 'dataViewId',
          patternList: undefined,
          title: 'index1,index2',
        },
        kibanaDataViews: [
          {
            id: 'dataViewId',
            patternList: undefined,
            title: 'index1,index2',
          },
        ],
        alertDataView: {
          id: '',
          patternList: [],
          title: '',
        },
        attackDataView: {
          id: 'attackDataViewId',
          patternList: ['index1', 'index2'],
          title: 'index1,index2',
        },
      });
    });
  });
});
