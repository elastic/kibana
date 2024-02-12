/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { deleteConnector } from './delete_connector';
import { getAllConnectors } from './get_all_connectors';

/**
 * Deletes all connectors by fetching all and deleting each one sequentially
 *
 * @param supertest The supertest agent
 * @param spaceId The space id (optional, defaults to "default")
 */
export async function deleteAllConnectors(
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  { spaceId = 'default' } = {}
): Promise<void> {
  const connectors = await getAllConnectors(supertest, { spaceId });

  for (const connector of connectors) {
    if (connector.isPreconfigured) {
      continue;
    }

    await deleteConnector(supertest, connector.id, { spaceId }).expect(204, '');
  }
}
