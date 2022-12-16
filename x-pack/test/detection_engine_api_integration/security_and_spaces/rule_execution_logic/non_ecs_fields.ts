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
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

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
  });
};
