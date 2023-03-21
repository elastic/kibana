/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { Spaces } from '../scenarios';

// eslint-disable-next-line import/no-default-export
export default function alertingApiIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('alerting api integration spaces only legacy configuration', function () {
    loadTestFile(require.resolve('./actions/connector_types/stack/webhook'));
  });
}

export async function buildUp(getService: FtrProviderContext['getService']) {
  const spacesService = getService('spaces');
  for (const space of Object.values(Spaces)) {
    if (space.id === 'default') continue;

    const { id, name, disabledFeatures } = space;
    await spacesService.create({ id, name, disabledFeatures });
  }
}

export async function tearDown(getService: FtrProviderContext['getService']) {
  const kibanaServer = getService('kibanaServer');
  await kibanaServer.savedObjects.cleanStandardList();

  const spacesService = getService('spaces');
  for (const space of Object.values(Spaces)) await spacesService.delete(space.id);
}
