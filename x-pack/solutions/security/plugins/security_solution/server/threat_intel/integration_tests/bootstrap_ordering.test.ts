/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import {
  THREAT_INTEL_INDICATORS_INDEX,
  THREAT_REPORTS_INDEX,
} from '../../../common/threat_intel/constants';
import { ensureThreatIntelBootstrap } from '../setup/bootstrap_threat_intel';
import { installIndexTemplates } from '../setup/index_templates';
import { getThreatIntelReadiness } from '../services/readiness';

const BOOTSTRAP_NOT_READY = 'Bootstrap is not ready';

describe('threat intel bootstrap ordering against Elasticsearch', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  const logger = loggingSystemMock.createLogger();

  const deleteThreatIntelIndicesAndTemplates = async () => {
    await esClient.indices.delete(
      {
        index: [THREAT_REPORTS_INDEX, THREAT_INTEL_INDICATORS_INDEX],
        ignore_unavailable: true,
        expand_wildcards: ['open', 'hidden'],
      },
      { ignore: [404] }
    );
    await esClient.indices.deleteIndexTemplate({ name: '*threat*' }, { ignore: [404] });
  };

  const getMapping = async (index: string) => {
    const response = await esClient.indices.getMapping({
      index,
      expand_wildcards: ['open', 'hidden'],
    });
    return response[index].mappings;
  };

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout) => jest.setTimeout(timeout),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    esClient = esServer.es.getClient() as unknown as ElasticsearchClient;
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  describe('on a fresh cluster', () => {
    beforeAll(async () => {
      await deleteThreatIntelIndicesAndTemplates();
      await installIndexTemplates({ esClient, logger });
    });

    it.each([THREAT_REPORTS_INDEX, THREAT_INTEL_INDICATORS_INDEX])(
      'creates %s with strict dynamic mapping',
      async (index) => {
        expect((await getMapping(index)).dynamic).toBe('strict');
      }
    );

    it('maps report content.title as semantic_text', async () => {
      const properties = (await getMapping(THREAT_REPORTS_INDEX)).properties as {
        content: { properties: { title: { type: string } } };
      };
      expect(properties.content.properties.title.type).toBe('semantic_text');
    });

    it('maps report content.body_text as semantic_text', async () => {
      const properties = (await getMapping(THREAT_REPORTS_INDEX)).properties as {
        content: { properties: { body_text: { type: string } } };
      };
      expect(properties.content.properties.body_text.type).toBe('semantic_text');
    });

    it.each([THREAT_REPORTS_INDEX, THREAT_INTEL_INDICATORS_INDEX])(
      'creates %s hidden',
      async (index) => {
        const settings = await esClient.indices.getSettings({
          index,
          expand_wildcards: ['open', 'hidden'],
        });
        expect(settings[index].settings?.index?.hidden).toBe('true');
      }
    );
  });

  describe('when a write creates the reports index before the template exists', () => {
    let installError: unknown;

    beforeAll(async () => {
      await deleteThreatIntelIndicesAndTemplates();
      await esClient.index({
        index: THREAT_REPORTS_INDEX,
        document: { content: { title: 'written before bootstrap', body_text: 'auto-created' } },
        refresh: true,
      });
      // The install attempt runs once here so the mapping assertion below sees its effect.
      installError = await installIndexTemplates({ esClient, logger }).then(
        () => undefined,
        (error: unknown) => error
      );
    });

    it('fails template installation closed instead of repairing the index', () => {
      expect(installError).toBeInstanceOf(Error);
      expect((installError as Error).message).toContain(BOOTSTRAP_NOT_READY);
    });

    it('leaves the reports index without strict dynamic mapping', async () => {
      expect((await getMapping(THREAT_REPORTS_INDEX)).dynamic).not.toBe('strict');
    });

    // Bootstrap retries template installation through `withElasticsearchRetry` (8 attempts,
    // 2s apart), so this sleeps about 14s before it rejects; the retry settings are not
    // injectable.
    it('rejects bootstrap', async () => {
      await expect(ensureThreatIntelBootstrap({ esClient, logger })).rejects.toThrow(
        BOOTSTRAP_NOT_READY
      );
    }, 120_000);

    it('reports reports_index_unmanaged as a reason readiness is blocked', async () => {
      const readiness = await getThreatIntelReadiness({
        esClient,
        spaceId: 'default',
        logger,
        getBootstrapReady: () => Promise.reject(new Error(BOOTSTRAP_NOT_READY)),
        request: httpServerMock.createKibanaRequest(),
        getInference: () => undefined,
        getSearchInferenceEndpoints: () => undefined,
      });
      expect(readiness.reasonCodes).toEqual(['bootstrap_incomplete', 'reports_index_unmanaged']);
    });
  });
});
