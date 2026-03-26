/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { EntityStoreUtils } from '../../../utils';

export async function cleanUpEntityStore(providerContext: FtrProviderContext): Promise<void> {
  const log = providerContext.getService('log');
  const es = providerContext.getService('es');
  const utils = EntityStoreUtils(providerContext.getService);
  const attempts = 5;
  const delayMs = 60000;

  await utils.cleanEngines();
  for (const kind of ['host', 'user', 'service', 'generic']) {
    const name: string = `entity_store_field_retention_${kind}_default_v1.0.0`;
    for (let currentAttempt = 0; currentAttempt < attempts; currentAttempt++) {
      try {
        await es.enrich.deletePolicy({ name }, { ignore: [404] });
        break;
      } catch (e) {
        log.error(`Error deleting policy ${name}: ${e.message} after ${currentAttempt} tries`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
