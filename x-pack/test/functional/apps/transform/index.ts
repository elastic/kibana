/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService, loadTestFile }: FtrProviderContext) {
  const transform = getService('transform');

  describe('transform', function() {
    this.tags(['ciGroup9', 'transform']);

    before(async () => {
      await transform.securityCommon.createTransformRoles();
      await transform.securityCommon.createTransformUsers();
    });

    after(async () => {
      await transform.securityCommon.cleanTransformUsers();
      await transform.securityCommon.cleanTransformRoles();
    });

    loadTestFile(require.resolve('./creation_index_pattern'));
    loadTestFile(require.resolve('./creation_saved_search'));
  });
}
