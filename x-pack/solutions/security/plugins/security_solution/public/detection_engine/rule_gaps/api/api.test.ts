/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH } from '@kbn/alerting-plugin/common';

import { KibanaServices } from '../../../common/lib/kibana';
import { scheduleRuleRunMock } from '../logic/__mocks__/mock';
import { scheduleRuleRun } from './api';

const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Detections Rule Gaps API', () => {
  describe('scheduleRuleRun', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(scheduleRuleRunMock);
    });

    test('schedules rule run', async () => {
      const timeRange = { startDate: moment().subtract(1, 'd'), endDate: moment() };
      await scheduleRuleRun({
        ruleIds: ['rule-1'],
        timeRange,
      });
      expect(fetchMock).toHaveBeenCalledWith(
        INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH,
        expect.objectContaining({
          body: `[{"rule_id":"rule-1","start":"${timeRange.startDate.toISOString()}","end":"${timeRange.endDate.toISOString()}"}]`,
          method: 'POST',
        })
      );
    });
  });
});
