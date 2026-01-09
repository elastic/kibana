/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useMovingAttacksCallout } from './use_moving_attacks_callout';

export const mockUseMovingAttacksCallout = (
  overrides?: Partial<ReturnType<typeof useMovingAttacksCallout>>
) => {
  const defaultMock: Partial<ReturnType<typeof useMovingAttacksCallout>> = {
    isMovingAttacksCalloutVisible: true,
    hideMovingAttacksCallout: jest.fn(),
    showMovingAttacksCallout: jest.fn(),
    ...overrides,
  };
  return defaultMock;
};
