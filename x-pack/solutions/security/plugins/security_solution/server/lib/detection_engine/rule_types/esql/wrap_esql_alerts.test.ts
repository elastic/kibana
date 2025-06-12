/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import { getEsqlRuleParams } from '../../rule_schema/mocks';
import { sampleDocNoSortIdWithTimestamp } from '../__mocks__/es_results';
import { wrapEsqlAlerts } from './wrap_esql_alerts';

import * as esqlUtils from './utils/generate_alert_id';
import { getSharedParamsMock } from '../__mocks__/shared_params';

const docId = 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71';

const sharedParams = getSharedParamsMock({
  ruleParams: getEsqlRuleParams(),
});

describe('wrapSuppressedEsqlAlerts', () => {
  test('should create an alert with the correct _id from a document', () => {
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapEsqlAlerts({
      sharedParams,
      events: [doc],
      isRuleAggregating: false,
      expandedFields: undefined,
    });

    expect(alerts[0]._id).toEqual('ed7fbf575371c898e0f0aea48cdf0bf1865939a9');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('ed7fbf575371c898e0f0aea48cdf0bf1865939a9');
  });

  test('should call generateAlertId for alert id', () => {
    jest.spyOn(esqlUtils, 'generateAlertId').mockReturnValueOnce('mocked-alert-id');
    const newSharedParams = getSharedParamsMock({
      ruleParams: getEsqlRuleParams({
        alertSuppression: {
          groupBy: ['someKey'],
        },
      }),
    });
    const doc = sampleDocNoSortIdWithTimestamp(docId);
    const alerts = wrapEsqlAlerts({
      sharedParams: newSharedParams,
      events: [doc],
      isRuleAggregating: true,
      expandedFields: undefined,
    });

    expect(alerts[0]._id).toEqual('mocked-alert-id');
    expect(alerts[0]._source[ALERT_UUID]).toEqual('mocked-alert-id');

    expect(esqlUtils.generateAlertId).toHaveBeenCalledWith(
      expect.objectContaining({
        completeRule: expect.any(Object),
        event: expect.any(Object),
        index: 0,
        isRuleAggregating: true,
        spaceId: 'default',
        tuple: {
          from: expect.any(Object),
          maxSignals: 10000,
          to: expect.any(Object),
        },
      })
    );
  });

  test('should filter our events with identical ids', () => {
    const doc1 = sampleDocNoSortIdWithTimestamp(docId);
    const doc2 = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d72');
    const doc3 = sampleDocNoSortIdWithTimestamp('d5e8eb51-a6a0-456d-8a15-4b79bfec3d73');
    const alerts = wrapEsqlAlerts({
      sharedParams,
      events: [doc1, doc1, doc2, doc2, doc3],
      isRuleAggregating: false,
      expandedFields: undefined,
    });

    expect(alerts).toHaveLength(3);
  });
});
