/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { DataView, DataViewListItem, DataViewsService } from '@kbn/data-views-plugin/common';
import {
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import {
  DEFAULT_ALERT_DATA_VIEW_ID,
  DEFAULT_ATTACK_DATA_VIEW_ID,
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_INDEX_KEY,
} from '../../../../../common/constants';
import type { InitializationFlowContext } from '../../types';
import {
  getOrCreateDefaultDataView,
  getOrCreateAlertDataView,
  getOrCreateAttackDataView,
  initializeSecurityDataViewsFlow,
} from '.';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SPACE_ID = 'default';
const SIGNAL_INDEX = '.siem-signals-default';

const createMockDataViewsService = (): jest.Mocked<DataViewsService> =>
  ({
    getIdsWithTitle: jest.fn().mockResolvedValue([]),
    createAndSave: jest.fn().mockImplementation(async (spec) => ({
      id: spec.id,
      title: spec.title,
      name: spec.name,
    })),
    get: jest.fn().mockImplementation(async (id: string) => ({
      id,
      title: 'mock-title',
      name: 'mock-name',
    })),
    updateSavedObject: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<DataViewsService>);

const makeDataViewListItem = (id: string, title: string, name?: string): DataViewListItem =>
  ({
    id,
    title,
    name: name ?? id,
  } as DataViewListItem);

// ---------------------------------------------------------------------------
// getOrCreateDefaultDataView
// ---------------------------------------------------------------------------

describe('getOrCreateDefaultDataView', () => {
  const dataViewId = `${DEFAULT_DATA_VIEW_ID}-${SPACE_ID}`;
  // ensurePatternFormat sorts patterns alphabetically, so the test data must be pre-sorted.
  const patternListFormatted = [SIGNAL_INDEX, 'auditbeat-*'];
  const patternListAsTitle = patternListFormatted.join();

  it('creates a new data view when none exists', async () => {
    const service = createMockDataViewsService();

    const result = await getOrCreateDefaultDataView({
      dataViewsService: service,
      allDataViews: [],
      dataViewId,
      patternListFormatted,
      patternListAsTitle,
    });

    expect(service.createAndSave).toHaveBeenCalledTimes(1);
    expect(service.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: dataViewId,
        name: 'Security solution default',
        title: patternListAsTitle,
      }),
      true
    );
    expect(result).toEqual({
      id: dataViewId,
      title: patternListAsTitle,
      patternList: patternListFormatted,
    });
  });

  it('returns the existing data view without updating when patterns and name match', async () => {
    const service = createMockDataViewsService();
    const existing = makeDataViewListItem(
      dataViewId,
      patternListAsTitle,
      'Security solution default'
    );

    const result = await getOrCreateDefaultDataView({
      dataViewsService: service,
      allDataViews: [existing],
      dataViewId,
      patternListFormatted,
      patternListAsTitle,
    });

    expect(service.createAndSave).not.toHaveBeenCalled();
    expect(service.get).not.toHaveBeenCalled();
    expect(service.updateSavedObject).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: dataViewId,
      title: patternListAsTitle,
      patternList: patternListFormatted,
    });
  });

  it('updates patterns when existing data view has different patterns', async () => {
    const service = createMockDataViewsService();
    const existingTitle = 'old-pattern-*';
    const existing = makeDataViewListItem(dataViewId, existingTitle, 'Security solution default');

    const mockDataView = {
      id: dataViewId,
      title: existingTitle,
      name: 'Security solution default',
    };
    service.get.mockResolvedValue(mockDataView as unknown as DataView);

    const result = await getOrCreateDefaultDataView({
      dataViewsService: service,
      allDataViews: [existing],
      dataViewId,
      patternListFormatted,
      patternListAsTitle,
    });

    expect(service.get).toHaveBeenCalledWith(dataViewId);
    expect(service.updateSavedObject).toHaveBeenCalledTimes(1);
    expect(mockDataView.title).toBe(patternListAsTitle);
    expect(result.patternList).toEqual(patternListFormatted);
  });

  it('updates name when existing data view has wrong name', async () => {
    const service = createMockDataViewsService();
    const existing = makeDataViewListItem(dataViewId, patternListAsTitle, 'Wrong name');

    const mockDataView = { id: dataViewId, title: patternListAsTitle, name: 'Wrong name' };
    service.get.mockResolvedValue(mockDataView as unknown as DataView);

    await getOrCreateDefaultDataView({
      dataViewsService: service,
      allDataViews: [existing],
      dataViewId,
      patternListFormatted,
      patternListAsTitle,
    });

    expect(service.updateSavedObject).toHaveBeenCalledTimes(1);
    expect(mockDataView.name).toBe('Security solution default');
  });

  it('handles DuplicateDataViewError by fetching the existing data view', async () => {
    const service = createMockDataViewsService();
    const duplicateErr = new Error('duplicate');
    duplicateErr.name = 'DuplicateDataViewError';
    service.createAndSave.mockRejectedValue(duplicateErr);
    service.get.mockResolvedValue({
      id: dataViewId,
      title: patternListAsTitle,
    } as unknown as DataView);

    const result = await getOrCreateDefaultDataView({
      dataViewsService: service,
      allDataViews: [],
      dataViewId,
      patternListFormatted,
      patternListAsTitle,
    });

    expect(service.get).toHaveBeenCalledWith(dataViewId);
    expect(result.id).toBe(dataViewId);
  });
});

// ---------------------------------------------------------------------------
// getOrCreateAlertDataView
// ---------------------------------------------------------------------------

describe('getOrCreateAlertDataView', () => {
  const dataViewId = `${DEFAULT_ALERT_DATA_VIEW_ID}-${SPACE_ID}`;

  it('creates a new alert data view when none exists', async () => {
    const service = createMockDataViewsService();

    const result = await getOrCreateAlertDataView({
      dataViewsService: service,
      allDataViews: [],
      dataViewId,
      indexName: SIGNAL_INDEX,
    });

    expect(service.createAndSave).toHaveBeenCalledTimes(1);
    expect(service.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: dataViewId,
        managed: true,
        name: 'Security solution alerts',
        title: SIGNAL_INDEX,
      }),
      true
    );
    expect(result.id).toBe(dataViewId);
  });

  it('returns existing alert data view without creating when it already exists', async () => {
    const service = createMockDataViewsService();
    const existing = makeDataViewListItem(dataViewId, SIGNAL_INDEX, 'Security solution alerts');

    const result = await getOrCreateAlertDataView({
      dataViewsService: service,
      allDataViews: [existing],
      dataViewId,
      indexName: SIGNAL_INDEX,
    });

    expect(service.createAndSave).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: dataViewId,
      title: SIGNAL_INDEX,
      patternList: [SIGNAL_INDEX],
    });
  });

  it('updates name when existing alert data view has wrong name', async () => {
    const service = createMockDataViewsService();
    const existing = makeDataViewListItem(dataViewId, SIGNAL_INDEX, 'Wrong alert name');

    const mockDataView = { id: dataViewId, title: SIGNAL_INDEX, name: 'Wrong alert name' };
    service.get.mockResolvedValue(mockDataView as unknown as DataView);

    await getOrCreateAlertDataView({
      dataViewsService: service,
      allDataViews: [existing],
      dataViewId,
      indexName: SIGNAL_INDEX,
    });

    expect(service.get).toHaveBeenCalledWith(dataViewId);
    expect(service.updateSavedObject).toHaveBeenCalledTimes(1);
    expect(mockDataView.name).toBe('Security solution alerts');
  });

  it('handles DuplicateDataViewError by fetching the existing data view', async () => {
    const service = createMockDataViewsService();
    const duplicateErr = new Error('duplicate');
    duplicateErr.name = 'DuplicateDataViewError';
    service.createAndSave.mockRejectedValue(duplicateErr);
    service.get.mockResolvedValue({
      id: dataViewId,
      title: SIGNAL_INDEX,
    } as unknown as DataView);

    const result = await getOrCreateAlertDataView({
      dataViewsService: service,
      allDataViews: [],
      dataViewId,
      indexName: SIGNAL_INDEX,
    });

    expect(service.get).toHaveBeenCalledWith(dataViewId);
    expect(result.id).toBe(dataViewId);
  });
});

// ---------------------------------------------------------------------------
// getOrCreateAttackDataView
// ---------------------------------------------------------------------------

describe('getOrCreateAttackDataView', () => {
  const dataViewId = `${DEFAULT_ATTACK_DATA_VIEW_ID}-${SPACE_ID}`;
  const patternList = ['.attack-discovery-default', SIGNAL_INDEX];

  it('creates a new attack data view when none exists', async () => {
    const service = createMockDataViewsService();

    const result = await getOrCreateAttackDataView({
      dataViewsService: service,
      allDataViews: [],
      dataViewId,
      patternList,
    });

    expect(service.createAndSave).toHaveBeenCalledTimes(1);
    expect(service.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: dataViewId,
        managed: true,
        name: 'Security solution attacks',
      }),
      true
    );
    expect(result.id).toBe(dataViewId);
  });

  it('returns existing attack data view without creating when it already exists', async () => {
    const service = createMockDataViewsService();
    const existingTitle = patternList.join();
    const existing = makeDataViewListItem(dataViewId, existingTitle, 'Security solution attacks');

    const result = await getOrCreateAttackDataView({
      dataViewsService: service,
      allDataViews: [existing],
      dataViewId,
      patternList,
    });

    expect(service.createAndSave).not.toHaveBeenCalled();
    expect(result.id).toBe(dataViewId);
  });

  it('handles DuplicateDataViewError by fetching the existing data view', async () => {
    const service = createMockDataViewsService();
    const duplicateErr = new Error('duplicate');
    duplicateErr.name = 'DuplicateDataViewError';
    service.createAndSave.mockRejectedValue(duplicateErr);
    service.get.mockResolvedValue({
      id: dataViewId,
      title: patternList.join(),
    } as unknown as DataView);

    const result = await getOrCreateAttackDataView({
      dataViewsService: service,
      allDataViews: [],
      dataViewId,
      patternList,
    });

    expect(service.get).toHaveBeenCalledWith(dataViewId);
    expect(result.id).toBe(dataViewId);
  });
});

// ---------------------------------------------------------------------------
// initializeSecurityDataViewsFlow
// ---------------------------------------------------------------------------

describe('initializeSecurityDataViewsFlow', () => {
  it('has the correct flow id', () => {
    expect(initializeSecurityDataViewsFlow.id).toBe(INITIALIZATION_FLOW_SECURITY_DATA_VIEWS);
  });

  it('should be configured to run in parallel', () => {
    expect(initializeSecurityDataViewsFlow.runFirst).toBeUndefined();
  });

  describe('runFlow', () => {
    let dataViewsService: jest.Mocked<DataViewsService>;

    beforeEach(() => {
      dataViewsService = createMockDataViewsService();
      dataViewsService.getIdsWithTitle.mockResolvedValue([]);
    });

    const createMockFlowContext = (
      overrides?: Partial<{
        enableAttackDataView: boolean;
        configPatternList: string[];
      }>
    ): InitializationFlowContext =>
      ({
        requestHandlerContext: {
          securitySolution: Promise.resolve({
            getInternalDataViewsService: jest.fn().mockResolvedValue(dataViewsService),
            getConfig: jest.fn().mockReturnValue({
              experimentalFeatures: {
                enableAlertsAndAttacksAlignment: overrides?.enableAttackDataView ?? false,
              },
            }),
            getRuleDataService: jest.fn().mockReturnValue({
              getResourceName: jest.fn().mockReturnValue(SIGNAL_INDEX),
            }),
            getSpaceId: jest.fn().mockReturnValue(SPACE_ID),
          }),
          core: Promise.resolve({
            uiSettings: {
              client: {
                get: jest.fn().mockResolvedValue(overrides?.configPatternList ?? ['auditbeat-*']),
              },
            },
          }),
        },
        logger: loggerMock.create(),
      } as unknown as InitializationFlowContext);

    it('returns status ready with default and alert data views', async () => {
      const context = createMockFlowContext();
      const result = await initializeSecurityDataViewsFlow.runFlow(context);

      expect(result.status).toBe(INITIALIZATION_FLOW_STATUS_READY);
      if (result.status === INITIALIZATION_FLOW_STATUS_READY && 'payload' in result) {
        expect(result.payload).toHaveProperty('defaultDataView');
        expect(result.payload).toHaveProperty('alertDataView');
        expect(result.payload).toHaveProperty('signalIndexName', SIGNAL_INDEX);
        expect(result.payload).toHaveProperty('kibanaDataViews');
        expect(result.payload).not.toHaveProperty('attackDataView');
      }
    });

    it('includes attackDataView in payload when enableAttackDataView is true', async () => {
      const context = createMockFlowContext({ enableAttackDataView: true });
      const result = await initializeSecurityDataViewsFlow.runFlow(context);

      expect(result.status).toBe(INITIALIZATION_FLOW_STATUS_READY);
      if (result.status === INITIALIZATION_FLOW_STATUS_READY && 'payload' in result) {
        expect(result.payload).toHaveProperty('attackDataView');
      }
    });

    it('creates data views via the data views service', async () => {
      const context = createMockFlowContext();
      await initializeSecurityDataViewsFlow.runFlow(context);

      // default + alert data views created
      expect(dataViewsService.createAndSave).toHaveBeenCalledTimes(2);
      expect(dataViewsService.createAndSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${DEFAULT_DATA_VIEW_ID}-${SPACE_ID}`,
          name: 'Security solution default',
        }),
        true
      );
      expect(dataViewsService.createAndSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${DEFAULT_ALERT_DATA_VIEW_ID}-${SPACE_ID}`,
          name: 'Security solution alerts',
          managed: true,
        }),
        true
      );
    });

    it('creates attack data view when enabled', async () => {
      const context = createMockFlowContext({ enableAttackDataView: true });
      await initializeSecurityDataViewsFlow.runFlow(context);

      // default + alert + attack
      expect(dataViewsService.createAndSave).toHaveBeenCalledTimes(3);
      expect(dataViewsService.createAndSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${DEFAULT_ATTACK_DATA_VIEW_ID}-${SPACE_ID}`,
          name: 'Security solution attacks',
          managed: true,
        }),
        true
      );
    });

    it('reads config pattern list from uiSettingsClient', async () => {
      const context = createMockFlowContext({ configPatternList: ['filebeat-*', 'packetbeat-*'] });
      await initializeSecurityDataViewsFlow.runFlow(context);

      const coreContext = await context.requestHandlerContext.core;
      expect(coreContext.uiSettings.client.get).toHaveBeenCalledWith(DEFAULT_INDEX_KEY);
    });

    it('refreshes data views list after creating/updating views', async () => {
      const context = createMockFlowContext();
      await initializeSecurityDataViewsFlow.runFlow(context);

      // getIdsWithTitle called twice: once at start, once after creates/updates
      expect(dataViewsService.getIdsWithTitle).toHaveBeenCalledTimes(2);
    });

    it('logs a success message', async () => {
      const context = createMockFlowContext();
      await initializeSecurityDataViewsFlow.runFlow(context);

      expect(context.logger.info).toHaveBeenCalledWith(
        `Sourcerer data views initialized for space '${SPACE_ID}'`
      );
    });
  });
});
