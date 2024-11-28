/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { DeprecationsDetails } from '@kbn/core/server';

import {
  createAlertsIndex,
  deleteAllAlerts,
} from '../../../../../../../../common/utils/security_solution';

import { FtrProviderContext } from '../../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  const getDeprecations = async (): Promise<DeprecationsDetails[]> => {
    const { body } = await supertest.get('/api/deprecations/').set('kbn-xsrf', 'true').expect(200);
    return body.deprecations;
  };

  const getLegacyIndicesDeprecation = async (): Promise<DeprecationsDetails | undefined> => {
    const deprecations = await getDeprecations();

    return deprecations.find(({ title }) => title === 'Found not migrated detection alerts');
  };

  describe('@ess Alerts migration deprecations API', () => {
    describe('no siem legacy indices exist', () => {
      it('should return empty siem signals deprecation', async () => {
        const deprecation = await getLegacyIndicesDeprecation();

        expect(deprecation).toBeUndefined();
      });
    });

    describe('siem legacy indices exist', () => {
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/signals/legacy_signals_index');
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/signals/legacy_signals_index');
        await deleteAllAlerts(supertest, log, es);
      });

      it('should return legacy siem signals deprecation', async () => {
        const deprecation = await getLegacyIndicesDeprecation();

        expect(deprecation?.level).toBe('critical');

        // ensures space and range are included in manual steps
        expect(deprecation?.correctiveActions.manualSteps[1]).toContain(
          'Spaces with at least one non-migrated signals index: default.'
        );
        expect(deprecation?.correctiveActions.manualSteps[2]).toContain(
          'Oldest non-migrated signal found with "2020-10-10T00:00:00.000Z" timestamp'
        );
      });

      describe('multiple spaces', () => {
        beforeEach(async () => {
          await esArchiver.load(
            'x-pack/test/functional/es_archives/signals/legacy_signals_index_non_default_space'
          );
        });

        afterEach(async () => {
          await esArchiver.unload(
            'x-pack/test/functional/es_archives/signals/legacy_signals_index_non_default_space'
          );
        });

        it('should return legacy siem signals deprecation with multiple spaces', async () => {
          const deprecation = await getLegacyIndicesDeprecation();

          expect(deprecation?.correctiveActions.manualSteps[1]).toContain('another-space');
          expect(deprecation?.correctiveActions.manualSteps[1]).toContain('default');
        });
      });
    });
  });
};
