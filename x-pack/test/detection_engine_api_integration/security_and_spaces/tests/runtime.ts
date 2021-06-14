/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getRuleForSignalTesting,
  getSignalsById,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  interface HostAlias {
    name: string;
    hostname: string;
  }

  describe('Tests involving runtime fields of source indexes and the signals index', () => {
    describe('Regular runtime field mappings', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/runtime');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/runtime');
      });

      it('should copy normal non-runtime data set from the source index into the signals index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForSignalTesting(['runtime']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((signal) => (signal._source.host as HostAlias).name);
        expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
      });

      // TODO: Make runtime fields able to be copied to where we can have ECS fields such as host.name filled out by them within the mapping directly
      it.skip('should copy "runtime mapping" data from a source index into the signals index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForSignalTesting(['runtime']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map(
          (signal) => (signal._source.host_alias as HostAlias).hostname
        );
        expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
      });
    });

    describe('Runtime field mappings that have conflicts within them', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/runtime_conflicting_fields'
        );
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/runtime_conflicting_fields'
        );
      });

      // TODO: Make the overrides of runtime fields override the host.name in this use case.
      it.skip('should copy normal non-runtime data set from the source index into the signals index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForSignalTesting(['runtime_conflicting_fields']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map((signal) => (signal._source.host as HostAlias).name);
        expect(hits).to.eql([
          'I am the [host.name] field value which shadows the original host.name value',
          'I am the [host.name] field value which shadows the original host.name value',
          'I am the [host.name] field value which shadows the original host.name value',
          'I am the [host.name] field value which shadows the original host.name value',
        ]);
      });

      // TODO: Make runtime fields able to be copied to where we can have ECS fields such as host.name filled out by them within the mapping directly
      it.skip('should copy "runtime mapping" data from a source index into the signals index in the same position when the target is ECS compatible', async () => {
        const rule = getRuleForSignalTesting(['runtime_conflicting_fields']);
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits.map(
          (signal) => (signal._source.host_alias as HostAlias).hostname
        );
        expect(hits).to.eql(['host name 1', 'host name 2', 'host name 3', 'host name 4']);
      });
    });
  });
};
