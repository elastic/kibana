/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreAttackDataService } from '../mitre_attack_data_service';

export interface MitreAttackDataServiceMock {
  ensureInitialized: jest.MockedFunction<MitreAttackDataService['ensureInitialized']>;
  populate: jest.MockedFunction<MitreAttackDataService['populate']>;
  initialize: jest.MockedFunction<MitreAttackDataService['initialize']>;
  isInitialized: boolean;
}

const createMitreAttackDataServiceMock = (): MitreAttackDataServiceMock => ({
  ensureInitialized: jest.fn().mockResolvedValue(true),
  populate: jest.fn().mockResolvedValue(true),
  initialize: jest.fn(),
  isInitialized: false,
});

export const mitreAttackDataServiceMock: {
  create: () => MitreAttackDataServiceMock;
} = {
  create: createMitreAttackDataServiceMock,
};
