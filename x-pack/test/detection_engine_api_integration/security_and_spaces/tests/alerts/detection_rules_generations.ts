/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import rule22 from '../../../../../plugins/security_solution/server/lib/detection_engine/rules/prepackaged_rules/command_and_control_dns_directly_to_the_internet.json';
import { fromKueryExpression } from '../../../../../../../../../../private/var/tmp/_bazel_garrettspong/a2009d763940a925f0063278083ebbc8/execroot/kibana/bazel-out/darwin-fastbuild/bin/packages/kbn-es-query';
import { createEventFromKueryNode } from '../../../../../plugins/security_solution/scripts/detections/create_source_event_from_query';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSignalsById,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('Alerts are created for all Detection Rules', () => {
    before(async () => {
      // TODO: There a base ECS mapping available to load?
      await esArchiver.load('x-pack/test/functional/es_archives/ml/module_security_endpoint');
      await esArchiver.load('x-pack/test/functional/es_archives/ml/module_siem_auditbeat');
      await esArchiver.load('x-pack/test/functional/es_archives/ml/module_siem_packetbeat');
      await esArchiver.load('x-pack/test/functional/es_archives/ml/module_siem_winlogbeat');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_security_endpoint');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_siem_auditbeat');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_siem_packetbeat');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_siem_winlogbeat');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
    });

    describe('load detection rules, generate source events from query, and verify signals', () => {
      it('should detect a single signal for a test kql rule', async () => {
        const index = 'ft_module_siem_auditbeat';
        const rule = {
          ...rule22,
          index: ['ft_module_siem_auditbeat'],
          timestamp_override: undefined,
          rule_id: 'testing',
        };
        const kqlQuery = fromKueryExpression(rule.query);
        const sourceEvent = createEventFromKueryNode(kqlQuery);

        await es.index({
          index,
          body: {
            ...sourceEvent,
            '@timestamp': new Date().toISOString(),
          },
          refresh: 'wait_for',
        });

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        expect(signalsOpen.hits.hits.length).to.eql(1);
      });
    });
  });
};
