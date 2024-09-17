/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../api_integration/ftr_provider_context';

export const cleanEngines = async ({
  getService,
}: {
  getService: FtrProviderContext['getService'];
}) => {
  const log = getService('log');
  const api = getService('securitySolutionApi');

  const { body } = await api.listEntityStoreEngines().expect(200);

  // @ts-expect-error body is any
  const engineTypes = body.engines.map((engine) => engine.type);

  log.info(`Cleaning engines: ${engineTypes.join(', ')}`);
  try {
    const responses = await Promise.all(
      engineTypes.map((entityType: 'user' | 'host') =>
        api.deleteEntityStore({ params: { entityType }, query: { data: true } })
      )
    );

    log.info(`Deleted engines: ${JSON.stringify(responses.map((r) => r.body))}`);
  } catch (e) {
    log.warning(`Error deleting engines: ${e.message}`);
  }
};
