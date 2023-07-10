/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  deleteAllRules,
  deleteAllAlerts,
  getPreviewAlerts,
  getRuleForSignalTesting,
  previewRule,
} from '../../utils';
import { dataGeneratorFactory, enhanceDocument } from '../../utils/data_generator';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const getQueryRule = (docIdToQuery: string) => ({
  ...getRuleForSignalTesting(['ecs_non_compliant']),
  query: `id: "${docIdToQuery}"`,
});

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const { indexListOfDocuments } = dataGeneratorFactory({
    es,
    index: 'ecs_non_compliant',
    log,
  });

  /**
   * test helper:
   * 1. index document with auto generated ID
   * 2. run preview query rule that targets document by ID
   * 3. return created preview alert and errors logs
   */
  const indexAndCreatePreviewAlert = async (document: Record<string, unknown>) => {
    const enhancedDocument = enhanceDocument({ document });
    await indexListOfDocuments([enhancedDocument]);

    const { previewId, logs } = await previewRule({
      supertest,
      rule: getQueryRule(enhancedDocument.id),
    });
    const previewAlerts = await getPreviewAlerts({ es, previewId });

    return {
      alertSource: previewAlerts?.[0]?._source,
      errors: logs[0].errors,
    };
  };

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/154277
  describe.skip('Non ECS fields in alert document source', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/security_solution/ecs_non_compliant'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/security_solution/ecs_non_compliant'
      );
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    // source agent.name is object, ECS mapping for agent.name is keyword
    it('should remove source object field from alert if ECS field mapping is keyword', async () => {
      const document = {
        agent: {
          name: {
            first: 'test name 1',
          },
          version: 'test-1',
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // valid ECS field is not getting removed
      expect(alertSource).toHaveProperty('agent.version', 'test-1');

      // invalid ECS field 'agent.name' is getting removed
      expect(alertSource).not.toHaveProperty('agent.name');
    });

    // source container.image is keyword, ECS mapping for container.image is object
    it('should remove source keyword field from alert if ECS field mapping is object', async () => {
      const document = {
        container: {
          name: 'test-image',
          image: 'test-1',
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // invalid ECS field 'container.image' is getting removed
      expect(alertSource).not.toHaveProperty('container.image');

      expect(alertSource).toHaveProperty('container.name', 'test-image');
    });

    // source agent.type is long, ECS mapping for agent.type is keyword
    it('should not remove source long field from alert if ECS field mapping is keyword', async () => {
      const document = {
        agent: {
          type: 13,
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // long value should be indexed as keyword
      expect(alertSource).toHaveProperty('agent.type', 13);
    });

    // source client.ip is keyword, ECS mapping for client.ip is ip
    it('should remove source non ip field from alert if ECS field mapping is ip', async () => {
      const document = {
        client: {
          ip: 'non-valid-ip',
          name: 'test name',
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // invalid ECS field is getting removed
      expect(alertSource).not.toHaveProperty('client.ip');

      expect(alertSource).toHaveProperty('client.name', 'test name');
    });

    it('should not remove valid ips from ECS source field', async () => {
      const ip = [
        '127.0.0.1',
        '::afff:4567:890a',
        '::',
        '::11.22.33.44',
        '1111:2222:3333:4444:AAAA:BBBB:CCCC:DDDD',
      ];
      const document = { client: { ip } };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);
      expect(alertSource).toHaveProperty('client.ip', ip);
    });

    // source event.created is boolean, ECS mapping for client.created is date
    it('should remove source non date field from alert if ECS field mapping is date', async () => {
      const document = {
        event: {
          end: true,
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // invalid ECS field is getting removed
      // event properties getting flattened, so we make sure event.created was removed
      expect(alertSource).not.toHaveProperty(['event.end']);
      expect(alertSource).not.toHaveProperty('event.end');
    });

    it('should not remove valid dates from ECS source field', async () => {
      const validDates = [
        '2015-01-01T12:10:30.666Z',
        '2015-01-01T12:10:30.666',
        '2015-01-01T12:10:30Z',
        '2015-01-01T12:10:30',
        '2015-01-01T12:10Z',
        '2015-01-01T12:10',
        '2015-01-01T12Z',
        '2015-01-01T12',
        '2015-01-01',
        '2015-01',
        '2015-01-02T',
        123.3,
        '23242',
        -1,
        '-1',
        0,
        '0',
      ];
      const document = {
        event: {
          created: validDates,
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // event properties getting flattened
      expect(alertSource).toHaveProperty(['event.created'], validDates);
    });

    // source threat.enrichments is keyword, ECS mapping for threat.enrichments is nested
    it('should remove source array of keywords field from alert if ECS field mapping is nested', async () => {
      const document = {
        threat: {
          enrichments: ['non-valid-threat-1', 'non-valid-threat-2'],
          'indicator.port': 443,
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // invalid ECS field is getting removed
      expect(alertSource).toHaveProperty('threat.enrichments', []);

      expect(alertSource).toHaveProperty('threat.indicator.port', 443);
    });

    // source client.bytes is text, ECS mapping for client.bytes is long
    it('should remove source text field from alert if ECS field mapping is long', async () => {
      const document = {
        client: {
          nat: {
            port: '3000',
          },
          bytes: 'conflict',
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // invalid ECS field is getting removed
      expect(alertSource).not.toHaveProperty('client.bytes');

      // ensures string numeric field is indexed
      expect(alertSource).toHaveProperty('client.nat.port', '3000');
    });

    // we don't validate it because geo_point is very complex type with many various representations: array, different object, string with few valid patterns
    // more on geo_point type https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-point.html
    it('should fail creating alert when ECS field mapping is geo_point', async () => {
      const document = {
        client: {
          geo: {
            name: 'test',
            location: 'test test',
          },
        },
      };

      const { errors } = await indexAndCreatePreviewAlert(document);

      expect(errors).toContain(
        'Bulk Indexing of signals failed: failed to parse field [client.geo.location] of type [geo_point]'
      );
    });

    it('should strip invalid boolean values and left valid ones', async () => {
      const document = {
        dll: {
          code_signature: {
            valid: ['non-valid', 'true', 'false', [true, false], '', 'False', 'True', 1],
          },
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // invalid ECS values is getting removed
      expect(alertSource).toHaveProperty('dll.code_signature.valid', [
        'true',
        'false',
        [true, false],
        '',
      ]);
    });

    // dll.code_signature.valid is boolean in ECS mapping
    it('should strip conflicting ECS mappings boolean field', async () => {
      const document = {
        dll: {
          code_signature: {
            valid: 'False',
          },
        },
      };

      const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

      expect(errors).toEqual([]);

      // invalid ECS field is getting removed
      expect(alertSource).not.toHaveProperty('dll.code_signature.valid');
    });

    describe('multi-fields', () => {
      it('should not add multi field .text to ecs compliant nested source', async () => {
        const document = {
          process: {
            command_line: 'string longer than 10 characters',
          },
        };

        const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

        expect(errors).toEqual([]);

        expect(alertSource).toHaveProperty('process', document.process);
        expect(alertSource).not.toHaveProperty('process.command_line.text');
      });

      it('should not add multi field .text to ecs compliant flattened source', async () => {
        const document = {
          'process.command_line': 'string longer than 10 characters',
        };

        const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

        expect(errors).toEqual([]);

        expect(alertSource?.['process.command_line']).toEqual(document['process.command_line']);
        expect(alertSource).not.toHaveProperty('process.command_line.text');
      });

      it('should not add multi field .text to ecs non compliant nested source', async () => {
        const document = {
          nonEcs: {
            command_line: 'string longer than 10 characters',
          },
        };

        const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

        expect(errors).toEqual([]);

        expect(alertSource).toHaveProperty('nonEcs', document.nonEcs);
        expect(alertSource).not.toHaveProperty('nonEcs.command_line.text');
      });

      it('should not add multi field .text to ecs non compliant flattened source', async () => {
        const document = {
          'nonEcs.command_line': 'string longer than 10 characters',
        };

        const { errors, alertSource } = await indexAndCreatePreviewAlert(document);

        expect(errors).toEqual([]);

        expect(alertSource?.['nonEcs.command_line']).toEqual(document['nonEcs.command_line']);
        expect(alertSource).not.toHaveProperty('nonEcs.command_line.text');
      });
    });
  });
};
