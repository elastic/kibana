/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ThreatMatchRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
} from '@kbn/detections-response-ftr-services';
import { getPreviewAlerts, previewRule, dataGeneratorFactory } from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

const EVENTS_INDEX = 'test-im-events';
const THREATS_INDEX = 'test-im-threats';

const nanosMappings: MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date_nanos' },
    host: { properties: { name: { type: 'keyword' } } },
  },
};

const millisMappings: MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date' },
    host: { properties: { name: { type: 'keyword' } } },
  },
};

/** timestamp with a nanosecond fraction, seconds apart per doc to keep sort values distinct */
const nanosTimestamp = (base: Date, index: number) =>
  new Date(base.getTime() - (index + 1) * 1000).toISOString().replace('Z', '123456Z');

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  const { indexListOfDocuments: indexEvents } = dataGeneratorFactory({
    es,
    index: EVENTS_INDEX,
    log,
  });
  const { indexListOfDocuments: indexThreats } = dataGeneratorFactory({
    es,
    index: THREATS_INDEX,
    log,
  });

  const getRule = (): ThreatMatchRuleCreateProps => ({
    ...getRuleForAlertTesting([EVENTS_INDEX]),
    // the default 1900 `from` is not representable on date_nanos fields
    from: 'now-1h',
    type: 'threat_match',
    language: 'kuery',
    query: '*:*',
    threat_query: '*:*',
    threat_language: 'kuery',
    threat_index: [THREATS_INDEX],
    threat_mapping: [{ entries: [{ field: 'host.name', value: 'host.name', type: 'mapping' }] }],
    // small page size to force search_after pagination over the test data
    items_per_search: 10,
    concurrent_searches: 1,
    max_signals: 200,
  });

  // pagination over a date_nanos timestamp field: https://github.com/elastic/kibana/issues/281834
  describe('@ess @serverless @serverlessQA Indicator match rule date_nanos pagination', () => {
    beforeEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await es.indices.delete({
        index: `${EVENTS_INDEX},${THREATS_INDEX}`,
        ignore_unavailable: true,
      });
    });

    it('pages through events in a date_nanos index when events are the outer loop', async () => {
      await es.indices.create({ index: EVENTS_INDEX, mappings: nanosMappings });
      await es.indices.create({ index: THREATS_INDEX, mappings: millisMappings });

      const base = new Date();
      // fewer events than threats -> events are paged with search_after (desc)
      const events = Array.from({ length: 25 }, (_, i) => ({
        '@timestamp': nanosTimestamp(base, i),
        host: { name: `host-${i}` },
      }));
      const threats = Array.from({ length: 30 }, (_, i) => ({
        '@timestamp': new Date(base.getTime() - (i + 1) * 1000).toISOString(),
        host: { name: `host-${i}` },
      }));
      await indexEvents(events);
      await indexThreats(threats);

      const { previewId, logs } = await previewRule({ supertest, rule: getRule() });

      expect(logs[0].errors).toEqual([]);
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: 400 });
      expect(previewAlerts).toHaveLength(25);
    });

    it('pages through a date_nanos threat index when threats are the outer loop', async () => {
      await es.indices.create({ index: EVENTS_INDEX, mappings: millisMappings });
      await es.indices.create({ index: THREATS_INDEX, mappings: nanosMappings });

      const base = new Date();
      // fewer threats than events -> the threat list is paged with search_after in a PIT
      const events = Array.from({ length: 30 }, (_, i) => ({
        '@timestamp': new Date(base.getTime() - (i + 1) * 1000).toISOString(),
        host: { name: `host-${i % 25}` },
      }));
      const threats = Array.from({ length: 25 }, (_, i) => ({
        '@timestamp': nanosTimestamp(base, i),
        host: { name: `host-${i}` },
      }));
      await indexEvents(events);
      await indexThreats(threats);

      const { previewId, logs } = await previewRule({ supertest, rule: getRule() });

      expect(logs[0].errors).toEqual([]);
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: 400 });
      expect(previewAlerts).toHaveLength(30);
    });
  });
};
