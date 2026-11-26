/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreAttackDataClient } from '../mitre_attack_data_client_interface';

export type MitreAttackDataClientMock = jest.Mocked<MitreAttackDataClient>;

const createMitreAttackDataClientMock = (): MitreAttackDataClientMock => ({
  getById: jest.fn(),
  list: jest.fn(),
});

export const mitreAttackDataClientMock: {
  create: () => MitreAttackDataClientMock;
} = {
  create: createMitreAttackDataClientMock,
};
