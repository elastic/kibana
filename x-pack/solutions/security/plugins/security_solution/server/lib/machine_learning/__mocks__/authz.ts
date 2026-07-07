/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlPluginServerMock } from '@kbn/ml-plugin/server/mocks';

export const mlServicesMock = mlPluginServerMock;

const mockValidateRuleType = jest.fn().mockResolvedValue({ valid: true, message: undefined });

const mockValidateInvalidRuleType = jest.fn().mockImplementation(async (type: string) => ({
  valid: type !== 'machine_learning',
  message: type === 'machine_learning' ? 'ML rules require a platinum license' : undefined,
}));

export const buildMlAuthz = jest.fn().mockReturnValue({ validateRuleType: mockValidateRuleType });

export const buildRestrictedMlAuthz = jest
  .fn()
  .mockReturnValue({ validateRuleType: mockValidateInvalidRuleType });
