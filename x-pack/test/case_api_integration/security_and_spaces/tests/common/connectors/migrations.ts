/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { SECURITY_SOLUTION_OWNER } from '../../../../../../plugins/cases/common/constants';
import { getConnectorMappingsFromES } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    describe('7.13.2', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      it('adds the owner field', async () => {
        const mappings = await getConnectorMappingsFromES({ es });
        expect(mappings.body.hits.hits.length).to.be(1);
        expect(mappings.body.hits.hits[0]._source?.['cases-connector-mappings'].owner).to.eql(
          SECURITY_SOLUTION_OWNER
        );
      });
    });
  });
}
