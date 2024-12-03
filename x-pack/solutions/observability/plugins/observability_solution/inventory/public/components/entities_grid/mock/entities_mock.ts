/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import type { InventoryEntity } from '../../../../common/entities';

const idGenerator = () => {
  let id = 0;
  return () => (++id).toString();
};

const generateId = idGenerator();

function generateRandomTimestamp() {
  const end = new Date();
  const start = new Date(end);

  start.setHours(start.getHours() - 24);
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

  return randomDate.toISOString();
}

const indentityFieldsPerType: Record<string, string[]> = {
  host: ['host.name'],
  container: ['container.id'],
  service: ['service.name'],
};

const getEntityLatest = (
  entityType: string,
  overrides?: Partial<InventoryEntity>
): InventoryEntity => ({
  entityLastSeenTimestamp: generateRandomTimestamp(),
  entityType,
  entityDisplayName: faker.person.fullName(),
  entityId: generateId(),
  entityDefinitionId: faker.string.uuid(),
  entityDefinitionVersion: '1.0.0',
  entityIdentityFields: indentityFieldsPerType[entityType],
  entitySchemaVersion: '1.0.0',
  ...overrides,
});

const alertsMock: InventoryEntity[] = [
  getEntityLatest('host', {
    alertsCount: 1,
  }),
  getEntityLatest('service', {
    alertsCount: 3,
  }),
  getEntityLatest('host', {
    alertsCount: 10,
  }),
  getEntityLatest('host', {
    alertsCount: 1,
  }),
];

const hostsMock = Array.from({ length: 20 }, () =>
  getEntityLatest('host', { cloud: { provider: 'gcp' } })
);
const containersMock = Array.from({ length: 20 }, () => getEntityLatest('container'));
const servicesMock = Array.from({ length: 20 }, () =>
  getEntityLatest('service', { agent: { name: 'java' } })
);

export const entitiesMock = [
  ...alertsMock,
  ...hostsMock,
  ...containersMock,
  ...servicesMock,
] as InventoryEntity[];
