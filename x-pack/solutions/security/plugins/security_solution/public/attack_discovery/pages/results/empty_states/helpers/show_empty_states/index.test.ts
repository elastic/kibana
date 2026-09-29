/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { showEmptyStates } from '.';
import {
  showEmptyPrompt,
  showFailurePrompt,
  showNoAlertsPrompt,
  showWelcomePrompt,
} from '../../../../helpers';

vi.mock('../../../../helpers', () => {
  const mocked = {
    showEmptyPrompt: vi.fn().mockReturnValue(false),
    showFailurePrompt: vi.fn().mockReturnValue(false),
    showNoAlertsPrompt: vi.fn().mockReturnValue(false),
    showWelcomePrompt: vi.fn().mockReturnValue(false),
  };
  return { ...mocked, default: mocked };
});

const defaultArgs = {
  aiConnectorsCount: 0,
  alertsContextCount: 0,
  attackDiscoveriesCount: 0,
  connectorId: undefined,
  failureReason: null,
  isLoading: false,
};

describe('showEmptyStates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true if showWelcomePrompt returns true', () => {
    (showWelcomePrompt as Mock).mockReturnValue(true);

    const result = showEmptyStates({
      ...defaultArgs,
    });
    expect(result).toBe(true);
  });

  it('returns true if showFailurePrompt returns true', () => {
    (showFailurePrompt as Mock).mockReturnValue(true);

    const result = showEmptyStates({
      ...defaultArgs,
      connectorId: 'test',
      failureReason: 'error',
    });
    expect(result).toBe(true);
  });

  it('returns true if showNoAlertsPrompt returns true', () => {
    (showNoAlertsPrompt as Mock).mockReturnValue(true);

    const result = showEmptyStates({
      ...defaultArgs,
      connectorId: 'test',
    });
    expect(result).toBe(true);
  });

  it('returns true if showEmptyPrompt returns true', () => {
    (showEmptyPrompt as Mock).mockReturnValue(true);

    const result = showEmptyStates({
      ...defaultArgs,
    });
    expect(result).toBe(true);
  });

  it('returns false if all prompts return false', () => {
    (showWelcomePrompt as Mock).mockReturnValue(false);
    (showFailurePrompt as Mock).mockReturnValue(false);
    (showNoAlertsPrompt as Mock).mockReturnValue(false);
    (showEmptyPrompt as Mock).mockReturnValue(false);

    const result = showEmptyStates({
      ...defaultArgs,
    });
    expect(result).toBe(false);
  });
});
