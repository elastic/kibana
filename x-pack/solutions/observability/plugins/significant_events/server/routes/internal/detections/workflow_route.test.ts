/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { internalDetectionsWorkflowRoutes } from './workflow_route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../lib/significant_events/create_significant_events_traced_es_client', () => ({
  createSignificantEventsTracedEsClient: jest.fn().mockReturnValue({}),
}));

const scanRoute =
  internalDetectionsWorkflowRoutes[
    'POST /internal/significant_events/detections/workflow/_change_point_scan'
  ];
type ScanHandlerParams = Parameters<typeof scanRoute.handler>[0];

const makeLink = (sourceId: string, ruleId: string): QueryLink =>
  ({
    source_id: sourceId,
    rule_backed: true,
    rule_id: ruleId,
    query: { id: `${ruleId}-query`, severity_score: 90 },
  } as QueryLink);

const setup = () => {
  const runChangePointScan = jest.fn().mockResolvedValue({ took: 1, by_rule: { buckets: [] } });
  const list = jest.fn().mockResolvedValue({ sources: [{ id: 'enabled-source' }], total: 1 });
  const handlerParams = {
    params: { body: { lookback: 'now-1440m', bucketInterval: '60m' } },
    request: {},
    getScopedClients: jest.fn().mockResolvedValue({
      scopedClusterClient: { asCurrentUser: {} },
      licensing: {},
      sourcesClient: { list },
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
        getRuleBackedQueryLinks: jest
          .fn()
          .mockResolvedValue([
            makeLink('enabled-source', 'rule-1'),
            makeLink('disabled-source', 'rule-2'),
          ]),
      }),
      getSignificantEventsAlertingContext: jest.fn().mockResolvedValue({
        alertsReader: { runChangePointScan, index: '.rule-events' },
      }),
    }),
    server: {},
    getSpaceId: jest.fn().mockResolvedValue('default'),
    telemetry: { trackSignificantEventsDetectionScan: jest.fn() },
    logger: { get: jest.fn() },
  } as unknown as ScanHandlerParams;
  return { handlerParams, runChangePointScan, list };
};

describe('change point scan route', () => {
  it('scans only the rules of enabled sources', async () => {
    const { handlerParams, runChangePointScan, list } = setup();

    await scanRoute.handler(handlerParams);

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    const scannedRuleIds = runChangePointScan.mock.calls.flatMap(([, { ruleIds }]) => ruleIds);
    expect(scannedRuleIds).toEqual(['rule-1']);
  });
});
