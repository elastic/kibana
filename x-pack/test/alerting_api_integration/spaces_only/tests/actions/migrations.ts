/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getUrlPrefix } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('actions');
    });

    after(async () => {
      await esArchiver.unload('actions');
    });

    it('7.10.0 migrates the `casesConfiguration` to be the `incidentConfiguration` in `config`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/actions/action/791a2ab1-784a-46ea-aa68-04c837e5da2d`
      );

      expect(response.status).to.eql(200);
      expect(response.body.config).key('incidentConfiguration');
      expect(response.body.config).not.key('casesConfiguration');
      expect(response.body.config.incidentConfiguration).to.eql({
        mapping: [
          {
            actionType: 'overwrite',
            source: 'title',
            target: 'summary',
          },
          {
            actionType: 'overwrite',
            source: 'description',
            target: 'description',
          },
          {
            actionType: 'append',
            source: 'comments',
            target: 'comments',
          },
        ],
      });
    });
  });
}
