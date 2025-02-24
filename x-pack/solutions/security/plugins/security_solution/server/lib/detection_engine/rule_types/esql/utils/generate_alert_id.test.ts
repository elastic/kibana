/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateAlertId } from './generate_alert_id';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { SignalSource } from '../../types';
import type { CompleteRule, EsqlRuleParams } from '../../../rule_schema';
import moment from 'moment';
import { cloneDeep } from 'lodash';

const mockEvent: estypes.SearchHit<SignalSource> = {
  _id: 'test_id',
  _version: 2,
  _index: 'test_index',
};

const mockRule = {
  alertId: 'test_alert_id',
  ruleParams: {
    query: 'from auditbeat*',
  },
} as CompleteRule<EsqlRuleParams>;

describe('generateAlertId', () => {
  describe('aggregating query', () => {
    const aggIdParams = {
      event: mockEvent,
      spaceId: 'default',
      completeRule: mockRule,
      tuple: {
        to: moment('2010-10-20 04:43:12'),
        from: moment('2010-10-20 04:10:12'),
        maxSignals: 100,
      },
      isRuleAggregating: true,
      index: 10,
    };

    const id = generateAlertId(aggIdParams);
    let modifiedIdParams: Parameters<typeof generateAlertId>['0'];

    beforeEach(() => {
      modifiedIdParams = cloneDeep(aggIdParams);
    });

    it('creates id dependant on time range tuple', () => {
      modifiedIdParams.tuple.from = moment('2010-10-20 04:20:12');
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });

    it('creates id dependant on data row index', () => {
      modifiedIdParams.index = 11;
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });

    it('creates id dependant on spaceId', () => {
      modifiedIdParams.spaceId = 'test-1';
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });

    it('creates id not dependant on event._id', () => {
      modifiedIdParams.event._id = 'another-id';
      expect(id).toBe(generateAlertId(modifiedIdParams));
    });
    it('creates id not dependant on event._version', () => {
      modifiedIdParams.event._version = 100;
      expect(id).toBe(generateAlertId(modifiedIdParams));
    });
    it('creates id not dependant on event._index', () => {
      modifiedIdParams.event._index = 'packetbeat-*';
      expect(id).toBe(generateAlertId(modifiedIdParams));
    });
    it('creates id dependant on rule alertId', () => {
      modifiedIdParams.completeRule.alertId = 'another-alert-id';
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });

    it('creates id dependant on rule query', () => {
      modifiedIdParams.completeRule.ruleParams.query = 'from packetbeat*';
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });
  });

  describe('non-aggregating query', () => {
    const nonAggIdParams = {
      event: mockEvent,
      spaceId: 'default',
      completeRule: mockRule,
      tuple: {
        to: moment('2010-10-20 04:43:12'),
        from: moment('2010-10-20 04:10:12'),
        maxSignals: 100,
      },
      isRuleAggregating: false,
      index: 10,
    };

    const id = generateAlertId(nonAggIdParams);
    let modifiedIdParams: Parameters<typeof generateAlertId>['0'];

    beforeEach(() => {
      modifiedIdParams = cloneDeep(nonAggIdParams);
    });

    it('creates id not dependant on time range tuple', () => {
      modifiedIdParams.tuple.from = moment('2010-10-20 04:20:12');
      expect(id).toBe(generateAlertId(modifiedIdParams));
    });

    it('creates id not dependant on data row index', () => {
      modifiedIdParams.index = 11;
      expect(id).toBe(generateAlertId(modifiedIdParams));
    });

    it('creates id dependant on spaceId', () => {
      modifiedIdParams.spaceId = 'test-1';
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });

    it('creates id dependant on event._id', () => {
      modifiedIdParams.event._id = 'another-id';
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });
    it('creates id dependant on event._version', () => {
      modifiedIdParams.event._version = 100;
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });
    it('creates id dependant on event._index', () => {
      modifiedIdParams.event._index = 'packetbeat-*';
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });
    it('creates id dependant on rule alertId', () => {
      modifiedIdParams.completeRule.alertId = 'another-alert-id';
      expect(id).not.toBe(generateAlertId(modifiedIdParams));
    });

    it('creates id not dependant on rule query', () => {
      modifiedIdParams.completeRule.ruleParams.query = 'from packetbeat*';
      expect(id).toBe(generateAlertId(modifiedIdParams));
    });
  });
});
