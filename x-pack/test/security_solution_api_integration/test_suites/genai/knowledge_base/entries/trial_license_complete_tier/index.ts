/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createSpacesAndUsers, deleteSpacesAndUsers } from '../utils/auth';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('GenAI - Knowledge Base Entries APIs', function () {
    before(async () => {
      await createSpacesAndUsers(getService);
    });

    after(async () => {
      await deleteSpacesAndUsers(getService);
    });

    loadTestFile(require.resolve('./entries'));
    loadTestFile(require.resolve('./semantic_text_indices'));
  });
}
