/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContextWithSpaces } from '../../../../../../ftr_provider_context_with_spaces';
import {
  createSpacesAndUsers,
  deleteSpacesAndUsers,
} from '../../../../../../../rule_registry/common/lib/authentication';

export default ({ loadTestFile, getService }: FtrProviderContextWithSpaces): void => {
  describe('@ess timeline security and spaces enabled: basic', function () {
    before(async () => {
      await createSpacesAndUsers(getService);
    });

    after(async () => {
      await deleteSpacesAndUsers(getService);
    });

    // Basic
    loadTestFile(require.resolve('./events'));
    loadTestFile(require.resolve('./import_timelines'));
    loadTestFile(require.resolve('./install_prepackaged_timelines'));
  });
};
