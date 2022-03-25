/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { obsOnlyRead } from '../../../common/lib/authentication/users';
import { getAlertsTargetIndices } from '../../../common/lib/helpers';

// eslint-disable-next-line import/no-default-export
export default function registryRulesApiTest({ getService }: FtrProviderContext) {
  const es = getService('es');

  describe('Rule Registry API', () => {
    describe('with read permissions', () => {
      it('does not bootstrap the apm rule indices', async () => {
        const { body: targetIndices } = await getAlertsTargetIndices(
          getService,
          obsOnlyRead,
          'space1'
        );
        const errorOrUndefined = await es.indices
          .get({
            index: targetIndices[0],
            expand_wildcards: 'open',
            allow_no_indices: false,
          })
          .then(() => {})
          .catch((error) => {
            return error.toString();
          });

        expect(errorOrUndefined).not.to.be(undefined);

        expect(errorOrUndefined).to.contain('index_not_found_exception');
      });
    });
  });
}
