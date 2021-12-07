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
  describe('alerting api integration spaces only', function () {
    this.tags('ciGroup12');

    loadTestFile(require.resolve('./actions'));
    loadTestFile(require.resolve('./alerting'));
    loadTestFile(require.resolve('./action_task_params'));
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
  const esArchiver = getService('esArchiver');
  await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
}
