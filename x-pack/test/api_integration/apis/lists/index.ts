/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function listsAPIIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('Lists plugin', function () {
    this.tags(['lists']);
    loadTestFile(require.resolve('./create_exception_list_item'));
  });
}
