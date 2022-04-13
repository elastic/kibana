/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createSpacesAndUsers, deleteSpacesAndUsers } from '../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('cases security and spaces enabled: basic', function () {
    // Fastest ciGroup for the moment.
    this.tags('ciGroup27');

    before(async () => {
      await createSpacesAndUsers(getService);
    });

    after(async () => {
      await deleteSpacesAndUsers(getService);
    });

    // Basic
    loadTestFile(require.resolve('./cases/push_case'));

    // Common
    loadTestFile(require.resolve('../common'));

    // NOTE: These need to be at the end because they could delete the .kibana index and inadvertently remove the users and spaces
    loadTestFile(require.resolve('../common/migrations'));
  });
};
