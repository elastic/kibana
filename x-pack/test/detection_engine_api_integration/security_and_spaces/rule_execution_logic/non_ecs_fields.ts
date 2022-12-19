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
  });
};
