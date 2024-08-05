/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-default-export */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');

  describe('edit space', () => {
    let cleanUp: () => Promise<unknown>;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      ({ cleanUp } = await spaces.api.createAndNavigateToSpace(
        { solution: 'oblt' },
        'observability'
      ));
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanUp?.();
    });

    describe('solution view', () => {
      it('does show the solution view panel', async () => {
        // TODO: add some test example
        // await testSubjects.existOrFail('spaces-edit-page');
        // await testSubjects.existOrFail('spaces-edit-page > generalPanel');
        // await testSubjects.existOrFail('spaces-edit-page > navigationPanel');
      });
    });
  });
}
