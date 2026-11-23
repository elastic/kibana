/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { deleteAllRules, deleteAllAlerts } from '@kbn/detections-response-ftr-services';
import {
  getCustomQueryRuleParams,
  getPreviewAlerts,
  previewRule,
  dataGeneratorFactory,
} from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

const NANOS_INDEX = 'test-date-nanos';
const MILLIS_INDEX = 'test-date-millis';

const nanosMappings: MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date' },
    event: { properties: { ingested: { type: 'date_nanos' } } },
    host: { properties: { name: { type: 'keyword' } } },
  },
};

const millisMappings: MappingTypeMapping = {
  properties: {
    '@timestamp': { type: 'date' },
    event: { properties: { ingested: { type: 'date' } } },
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

  const { indexListOfDocuments: indexNanosDocs } = dataGeneratorFactory({
    es,
    index: NANOS_INDEX,
    log,
  });
  const { indexListOfDocuments: indexMillisDocs } = dataGeneratorFactory({
    es,
    index: MILLIS_INDEX,
    log,
  });

  // pagination over a date_nanos timestamp field: https://github.com/elastic/kibana/issues/281834
  describe('@ess @serverless @serverlessQA Query rule date_nanos pagination', () => {
    beforeEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await es.indices.delete({
        index: `${NANOS_INDEX},${MILLIS_INDEX}`,
        ignore_unavailable: true,
      });
      await es.indices.create({ index: NANOS_INDEX, mappings: nanosMappings });
      await es.indices.create({ index: MILLIS_INDEX, mappings: millisMappings });
    });

    it('pages through more than 100 events sorted on a date_nanos timestamp override', async () => {
      const base = new Date();
      const docs = Array.from({ length: 150 }, (_, i) => {
        const timestamp = nanosTimestamp(base, i);
        return {
          '@timestamp': timestamp,
          event: { ingested: timestamp },
          host: { name: `host-${i}` },
        };
      });
      await indexNanosDocs(docs);

      const rule = getCustomQueryRuleParams({
        index: [NANOS_INDEX],
        query: '*:*',
        from: 'now-1h',
        timestamp_override: 'event.ingested',
        max_signals: 200,
      });

      const { previewId, logs } = await previewRule({ supertest, rule });

      expect(logs[0].errors).toEqual([]);
      expect(logs[0].warnings).toEqual([]);
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: 400 });
      expect(previewAlerts).toHaveLength(150);
    });

    it('creates alerts for events missing the date_nanos timestamp override when fallback is enabled', async () => {
      const base = new Date();
      const docs = Array.from({ length: 150 }, (_, i) => {
        const timestamp = nanosTimestamp(base, i);
        // half the docs rely on the @timestamp fallback
        return i % 2 === 0
          ? { '@timestamp': timestamp, event: { ingested: timestamp }, host: { name: `host-${i}` } }
          : { '@timestamp': timestamp, host: { name: `host-${i}` } };
      });
      await indexNanosDocs(docs);

      const rule = getCustomQueryRuleParams({
        index: [NANOS_INDEX],
        query: '*:*',
        from: 'now-1h',
        timestamp_override: 'event.ingested',
        timestamp_override_fallback_disabled: false,
        max_signals: 200,
      });

      const { previewId, logs } = await previewRule({ supertest, rule });

      expect(logs[0].errors).toEqual([]);
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: 400 });
      expect(previewAlerts).toHaveLength(150);
    });

    it('pages through a mixed date and date_nanos index pattern', async () => {
      const base = new Date();
      const nanosDocs = Array.from({ length: 80 }, (_, i) => {
        const timestamp = nanosTimestamp(base, i);
        return {
          '@timestamp': timestamp,
          event: { ingested: timestamp },
          host: { name: `nanos-${i}` },
        };
      });
      const millisDocs = Array.from({ length: 80 }, (_, i) => {
        const timestamp = new Date(base.getTime() - (i + 1) * 1000).toISOString();
        return {
          '@timestamp': timestamp,
          event: { ingested: timestamp },
          host: { name: `millis-${i}` },
        };
      });
      await indexNanosDocs(nanosDocs);
      await indexMillisDocs(millisDocs);

      const rule = getCustomQueryRuleParams({
        index: [NANOS_INDEX, MILLIS_INDEX],
        query: '*:*',
        from: 'now-1h',
        timestamp_override: 'event.ingested',
        max_signals: 200,
      });

      const { previewId, logs } = await previewRule({ supertest, rule });

      expect(logs[0].errors).toEqual([]);
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: 400 });
      expect(previewAlerts).toHaveLength(160);
    });

    it('selects the earliest events when max_signals truncates a mixed pattern', async () => {
      const base = new Date();
      const nanosDocs = [4, 2, 0].map((index) => {
        const timestamp = nanosTimestamp(base, index);
        return {
          '@timestamp': timestamp,
          event: { ingested: timestamp },
          host: { name: `nanos-${index + 1}` },
        };
      });
      const millisDocs = [4, 2].map((seconds) => {
        const timestamp = new Date(base.getTime() - seconds * 1000).toISOString();
        return {
          '@timestamp': timestamp,
          event: { ingested: timestamp },
          host: { name: `millis-${seconds}` },
        };
      });
      await indexNanosDocs(nanosDocs);
      await indexMillisDocs(millisDocs);

      const rule = getCustomQueryRuleParams({
        index: [NANOS_INDEX, MILLIS_INDEX],
        query: '*:*',
        from: 'now-1h',
        timestamp_override: 'event.ingested',
        max_signals: 3,
      });

      const { previewId, logs } = await previewRule({ supertest, rule });

      expect(logs[0].errors).toEqual([]);
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: 10 });
      const hostNames = previewAlerts.map((alert) => alert._source?.host?.name).sort();
      expect(hostNames).toEqual(['millis-4', 'nanos-3', 'nanos-5']);
    });

    it('finishes without a warning when the final mixed-pattern page has an unusable cursor', async () => {
      const base = new Date();
      const nanosDocs = Array.from({ length: 120 }, (_, i) => {
        const timestamp = nanosTimestamp(base, i);
        return {
          '@timestamp': timestamp,
          event: { ingested: timestamp },
          host: { name: `nanos-${i}` },
        };
      });
      // missing override field: gets the `missing` sort value, which is
      // unrepresentable on the date-mapped shard and stops pagination there
      const millisDocs = Array.from({ length: 5 }, (_, i) => ({
        '@timestamp': new Date(base.getTime() - (i + 1) * 1000).toISOString(),
        host: { name: `millis-missing-${i}` },
      }));
      await indexNanosDocs(nanosDocs);
      await indexMillisDocs(millisDocs);

      const rule = getCustomQueryRuleParams({
        index: [NANOS_INDEX, MILLIS_INDEX],
        query: '*:*',
        from: 'now-1h',
        timestamp_override: 'event.ingested',
        timestamp_override_fallback_disabled: false,
        max_signals: 200,
      });

      const { previewId, logs } = await previewRule({ supertest, rule });

      expect(logs[0].errors).toEqual([]);
      expect(logs[0].warnings).toEqual([]);
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: 400 });
      expect(previewAlerts).toHaveLength(125);
    });

    it('keeps paging through date-only indices when the secondary timestamp holds values beyond the date_nanos range', async () => {
      const base = new Date();
      const docs = Array.from({ length: 150 }, (_, i) => {
        const timestamp = new Date(base.getTime() - (i + 1) * 1000).toISOString();
        // junk far-future @timestamp values are valid for date fields and must not break paging
        return {
          '@timestamp': i % 10 === 0 ? '9999-01-01T00:00:00.000Z' : timestamp,
          event: { ingested: timestamp },
          host: { name: `host-${i}` },
        };
      });
      await indexMillisDocs(docs);

      const rule = getCustomQueryRuleParams({
        index: [MILLIS_INDEX],
        query: '*:*',
        from: 'now-1h',
        timestamp_override: 'event.ingested',
        timestamp_override_fallback_disabled: false,
        max_signals: 200,
      });

      const { previewId, logs } = await previewRule({ supertest, rule });

      expect(logs[0].errors).toEqual([]);
      expect(logs[0].warnings).toEqual([]);
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: 400 });
      expect(previewAlerts).toHaveLength(150);
    });
  });
};
