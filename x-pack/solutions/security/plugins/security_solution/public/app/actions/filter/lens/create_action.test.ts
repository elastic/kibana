/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addExistsFilter, addFilterIn, addFilterOut } from '@kbn/cell-actions/actions';
import { of } from 'rxjs';
import type { CellValueContext } from '@kbn/embeddable-plugin/public';
import type { CreateFilterLensActionParams } from './create_action';
import { createFilterLensAction } from './create_action';
import type { Trigger } from '@kbn/ui-actions-plugin/public';

jest.mock('@kbn/cell-actions/actions', () => ({
  addFilterIn: jest.fn(),
  addFilterOut: jest.fn(),
  addExistsFilter: jest.fn(),
}));

jest.mock('../../../../timelines/store', () => ({
  timelineSelectors: {
    getTimelineByIdSelector: jest.fn().mockReturnValue(() => ({})),
  },
}));

describe('createFilterLensAction', () => {
  const mockServices = {
    timelineDataService: { query: { filterManager: 'mockTimelineFilterManager' } },
    data: { query: { filterManager: 'mockFilterManager' } },
    application: { currentAppId$: of('appId') },
    topValuesPopover: {
      closePopover: jest.fn(),
    },
    notifications: {
      toasts: {
        addWarning: jest.fn(),
      },
    },
  };
  const mockStore = {
    getState: jest.fn(),
  };

  const mockUserCountData = [
    {
      columnMeta: {
        field: 'user.count',
        sourceParams: {
          type: 'value_count',
          indexPatternId: 'indexPatternId',
        },
      },
      value: [1],
    },
  ] as unknown as CellValueContext['data'];

  const mockUserNameData = [
    {
      columnMeta: {
        field: 'user.name',
        sourceParams: {
          type: 'string',
          indexPatternId: 'indexPatternId',
        },
      },
      value: 'elastic',
    },
  ] as unknown as CellValueContext['data'];

  const mockTrigger = {
    id: 'triggerId',
    title: 'triggerTitle',
    description: 'triggerDescription',
  } as Trigger;

  const params = {
    id: 'embeddable_filterIn',
    order: 0,
    store: mockStore,
    services: mockServices,
  } as unknown as CreateFilterLensActionParams;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a "filter In" action with the field value', async () => {
    const { execute } = createFilterLensAction(params);
    await execute({
      data: mockUserNameData,
      trigger: mockTrigger,
    });
    expect(addFilterIn).toHaveBeenCalledWith({
      filterManager: 'mockFilterManager',
      fieldName: 'user.name',
      value: ['elastic'],
      dataViewId: 'indexPatternId',
    });
    expect(addFilterOut).not.toHaveBeenCalled();
  });

  it('should create a "filter Out" action with the field value', async () => {
    const testParams = {
      ...params,
      id: 'embeddable_filterOut',
      negate: true,
    };
    const { execute } = createFilterLensAction(testParams);
    await execute({
      data: mockUserNameData,
      trigger: mockTrigger,
    });
    expect(addFilterIn).not.toHaveBeenCalled();
    expect(addFilterOut).toHaveBeenCalledWith({
      filterManager: 'mockFilterManager',
      fieldName: 'user.name',
      value: ['elastic'],
      dataViewId: 'indexPatternId',
    });
  });

  it('should create an "exists" filter when value type equals "value_count"', async () => {
    const { execute } = createFilterLensAction(params);
    await execute({
      data: mockUserCountData,
      trigger: mockTrigger,
    });
    expect(addExistsFilter).toHaveBeenCalledWith({
      filterManager: 'mockFilterManager',
      key: 'user.count',
      negate: false,
      dataViewId: 'indexPatternId',
    });
  });

  it('should create an "Not exists" filter when value type equals "value_count"', async () => {
    const testParams = {
      ...params,
      negate: true,
    };
    const { execute } = createFilterLensAction(testParams);
    await execute({
      data: mockUserCountData,
      trigger: mockTrigger,
    });
    expect(addExistsFilter).toHaveBeenCalledWith({
      filterManager: 'mockFilterManager',
      key: 'user.count',
      negate: true,
      dataViewId: 'indexPatternId',
    });
    expect(addFilterIn).not.toHaveBeenCalled();
  });

  it('should show a warning toast when the value is not supported', async () => {
    const { execute } = createFilterLensAction(params);
    await execute({
      data: [
        {
          columnMeta: {
            field: 'user.name',
            sourceParams: {
              type: 'string',
              indexPatternId: 'indexPatternId',
            },
          },
          value: [[1], '1', 'foo'],
        },
      ] as unknown as CellValueContext['data'],
      trigger: mockTrigger,
    });
    expect(mockServices.notifications.toasts.addWarning).toHaveBeenCalled();
  });

  it('should not create a filter when the field is missing', async () => {
    const { execute } = createFilterLensAction(params);
    await execute({
      data: [
        {
          columnMeta: {},
          value: 'elastic',
        },
      ] as unknown as CellValueContext['data'],
      trigger: mockTrigger,
    });
    expect(addFilterIn).not.toHaveBeenCalled();
    expect(addFilterOut).not.toHaveBeenCalled();
  });
});
