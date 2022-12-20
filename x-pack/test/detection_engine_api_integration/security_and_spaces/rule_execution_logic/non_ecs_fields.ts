/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

import {
  deleteAllAlerts,
  deleteSignalsIndex,
  getPreviewAlerts,
  getRuleForSignalTesting,
  previewRule,
} from '../../utils';
import { indexDocumentsFactory } from '../../utils/data_generator';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const getQueryRule = (docIdToQuery: string) => ({
  ...getRuleForSignalTesting(['ecs_non_compliant']),
  query: `id: "${docIdToQuery}"`,
});

const getDocument = (id: string, doc: Record<string, unknown>) => ({
  id,
  ...doc,
});

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const indexDocuments = indexDocumentsFactory({
    es,
    index: 'ecs_non_compliant',
  });

  const previewRuleAndGetAlertSource = async (documentId: string) => {
    const { previewId, logs } = await previewRule({
      supertest,
      rule: getQueryRule(documentId),
    });
    const previewAlerts = await getPreviewAlerts({ es, previewId });

    return {
      alertSource: previewAlerts?.[0]?._source,
      errors: logs[0].errors,
    };
  };

  describe('Non ECS fields in alert document source', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/security_solution/ecs_non_compliant'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/security_solution/ecs_non_compliant'
      );
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    // source agent.name is object, ECS mapping for agent.name is keyword
    it('should remove source object field from alert if ECS field mapping is keyword', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForSignalTesting(['ecs_non_compliant']),
        query: `id: "agent.name is object"`,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      // valid ECS field is not getting removed
      expect(previewAlerts[0]._source).toHaveProperty('agent.version', 'test-1');

      // invalid ECS field 'agent.name' is getting removed
      expect(previewAlerts[0]._source).not.toHaveProperty('agent.name');
    });

    // source container.image is keyword, ECS mapping for container.image is object
    it('should remove source keyword field from alert if ECS field mapping is object', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForSignalTesting(['ecs_non_compliant']),
        query: `id: "container.image is keyword"`,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      // invalid ECS field 'container.image' is getting removed
      expect(previewAlerts[0]._source).not.toHaveProperty('container.image');
    });

    // source agent.type is long, ECS mapping for agent.type is keyword
    it('should not remove source long field from alert if ECS field mapping is keyword', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForSignalTesting(['ecs_non_compliant']),
        query: `id: "agent.type is long"`,
      };
      const { previewId, logs } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(logs[0].errors).toEqual([]);

      // long value should be indexed as keyword
      expect(previewAlerts[0]._source).toHaveProperty('agent.type', 13);
    });

    // source client.ip is keyword, ECS mapping for client.ip is ip
    it('should remove source non ip field from alert if ECS field mapping is ip', async () => {
      const documentId = 'client.ip is keyword';

      await indexDocuments([
        {
          id: documentId,
          client: {
            ip: 'non-valid-ip',
            name: 'test name',
          },
        },
      ]);

      const rule: QueryRuleCreateProps = {
        ...getRuleForSignalTesting(['ecs_non_compliant']),
        query: `id: "${documentId}"`,
      };
      const { previewId, logs } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(logs[0].errors).toEqual([]);

      // invalid ECS field is getting removed
      expect(previewAlerts[0]._source).not.toHaveProperty('client.ip');

      expect(previewAlerts[0]._source).toHaveProperty('client.name', 'test name');
    });

    // source event.created is text, ECS mapping for client.created is date
    it('should remove source non date field from alert if ECS field mapping is date', async () => {
      const documentId = 'event.created is keyword';
      await indexDocuments([
        getDocument(documentId, {
          event: {
            created: 'non-valid-date',
            end: '2022-12-19',
          },
        }),
      ]);

      const { previewId, logs } = await previewRule({ supertest, rule: getQueryRule(documentId) });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(logs[0].errors).toEqual([]);

      // invalid ECS field is getting removed
      // event properties getting flattened, so we make sure event.created was removed
      expect(previewAlerts[0]._source).not.toHaveProperty(['event.created']);
      expect(previewAlerts[0]._source).not.toHaveProperty('event.created');

      expect(previewAlerts[0]._source).toHaveProperty(['event.end'], '2022-12-19');
    });

    // source threat.enrichments is keyword, ECS mapping for threat.enrichments is nested
    it('should remove source array of keywords field from alert if ECS field mapping is nested', async () => {
      const documentId = 'threat.enrichments is keyword array';
      await indexDocuments([
        getDocument(documentId, {
          threat: {
            enrichments: ['non-valid-threat-1', 'non-valid-threat-2'],
            'indicator.port': 443,
          },
        }),
      ]);

      const { errors, alertSource } = await previewRuleAndGetAlertSource(documentId);

      expect(errors).toEqual([]);

      // invalid ECS field is getting removed
      expect(alertSource).not.toHaveProperty('threat.enrichments');

      expect(alertSource).toHaveProperty('threat.indicator.port', 443);
    });

    // source client.bytes is text, ECS mapping for client.bytes is long
    it('should remove source text field from alert if ECS field mapping is long', async () => {
      const documentId = 'client.bytes is text';
      await indexDocuments([
        getDocument(documentId, {
          client: {
            nat: {
              port: '3000',
            },
            bytes: 'conflict',
          },
        }),
      ]);

      const { errors, alertSource } = await previewRuleAndGetAlertSource(documentId);

      expect(errors).toEqual([]);

      // invalid ECS field is getting removed
      expect(alertSource).not.toHaveProperty('client.bytes');

      // ensures string numeric field is indexed
      expect(alertSource).toHaveProperty('client.nat.port', '3000');
    });

    // we don't validate it because geo_point is very complex type with many various representations: array, different object, string with few valid patterns
    // more on geo_point type https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-point.html
    it('should fail creating alert when ECS field mapping is geo_point', async () => {
      const documentId = 'client.geo.location is keyword';
      await indexDocuments([
        getDocument(documentId, {
          client: {
            geo: {
              name: 'test',
              location: 'test test',
            },
          },
        }),
      ]);

      const { errors } = await previewRuleAndGetAlertSource(documentId);

      expect(errors).toContain(
        'Bulk Indexing of signals failed: failed to parse field [client.geo.location] of type [geo_point]'
      );
    });
  });
};
