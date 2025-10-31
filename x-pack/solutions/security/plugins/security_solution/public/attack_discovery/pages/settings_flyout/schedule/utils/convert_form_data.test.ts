/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { AIConnector } from '@kbn/elastic-assistant';

import { convertFormDataInBaseSchedule } from './convert_form_data';
import { convertToBuildEsQuery } from '../../../../../common/lib/kuery';
import { getGenAiConfig } from '../../../use_attack_discovery/helpers';
import { parseFilterQuery } from '../../parse_filter_query';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('../../../../../common/lib/kuery');
jest.mock('../../../use_attack_discovery/helpers');
jest.mock('../../parse_filter_query');

describe('convertFormDataInBaseSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (convertToBuildEsQuery as jest.Mock).mockReturnValue(['test-filter-query']);
    (getGenAiConfig as jest.Mock).mockReturnValue({ defaultModel: 'test-model' });
    (parseFilterQuery as jest.Mock).mockReturnValue({ filter: { field: 'test' } });
  });

  it('should convert form data into a base schedule schema', () => {
    const baseSchedule = convertFormDataInBaseSchedule(
      {
        name: 'test 1',
        connectorId: 'connector 1',
        alertsSelectionSettings: {
          end: 'now-5s',
          filters: [],
          query: {
            query: 'test: exists',
            language: 'kuery',
          },
          size: 145,
          start: 'now-99m',
        },
        interval: '23m',
        actions: [],
      },
      '.alert-*',
      {} as AIConnector,
      {
        get: jest.fn(),
      } as unknown as IUiSettingsClient,
      createStubDataView({ spec: {} })
    );
    expect(baseSchedule).toEqual({
      actions: [],
      enabled: true,
      name: 'test 1',
      params: {
        alertsIndexPattern: '.alert-*',
        apiConfig: { model: 'test-model' },
        combinedFilter: { filter: { field: 'test' } },
        end: 'now-5s',
        filters: [],
        query: { language: 'kuery', query: 'test: exists' },
        size: 145,
        start: 'now-99m',
      },
      schedule: { interval: '23m' },
    });
  });
});
