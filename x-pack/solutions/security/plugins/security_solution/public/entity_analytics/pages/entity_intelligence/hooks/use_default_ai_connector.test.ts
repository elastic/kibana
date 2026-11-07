/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/inference-connectors';
import { resolveDefaultAiConnectorId } from './use_default_ai_connector';

const connector = (id: string, overrides: Partial<AIConnector> = {}): AIConnector =>
  ({
    id,
    name: `${id} name`,
    actionTypeId: '.inference',
    isMissingSecrets: false,
    ...overrides,
  } as AIConnector);

describe('resolveDefaultAiConnectorId', () => {
  const configured = connector('configured-default');
  const stored = connector('stored');
  const first = connector('first');
  const connectors = [first, stored, configured];

  it('prefers the configured default connector over stored and first', () => {
    expect(
      resolveDefaultAiConnectorId({
        connectors,
        configuredDefaultConnectorId: 'configured-default',
        storedConnectorId: 'stored',
        hasSpaceId: true,
      })
    ).toBe('configured-default');
  });

  it('falls back to the stored connector when no configured default is set', () => {
    expect(
      resolveDefaultAiConnectorId({
        connectors,
        configuredDefaultConnectorId: undefined,
        storedConnectorId: 'stored',
        hasSpaceId: true,
      })
    ).toBe('stored');
  });

  it('falls back to the stored connector when the configured default is not in the list', () => {
    expect(
      resolveDefaultAiConnectorId({
        connectors,
        configuredDefaultConnectorId: 'does-not-exist',
        storedConnectorId: 'stored',
        hasSpaceId: true,
      })
    ).toBe('stored');
  });

  it('falls back to the first connector when no configured default and no valid stored connector', () => {
    expect(
      resolveDefaultAiConnectorId({
        connectors,
        configuredDefaultConnectorId: undefined,
        storedConnectorId: 'does-not-exist',
        hasSpaceId: true,
      })
    ).toBe('first');
  });

  it('ignores the stored connector when no space id is known', () => {
    expect(
      resolveDefaultAiConnectorId({
        connectors,
        configuredDefaultConnectorId: undefined,
        storedConnectorId: 'stored',
        hasSpaceId: false,
      })
    ).toBe('first');
  });

  it('still honors the configured default even when no space id is known', () => {
    expect(
      resolveDefaultAiConnectorId({
        connectors,
        configuredDefaultConnectorId: 'configured-default',
        storedConnectorId: 'stored',
        hasSpaceId: false,
      })
    ).toBe('configured-default');
  });

  it('returns "" when there are no connectors', () => {
    expect(
      resolveDefaultAiConnectorId({
        connectors: [],
        configuredDefaultConnectorId: 'configured-default',
        storedConnectorId: 'stored',
        hasSpaceId: true,
      })
    ).toBe('');
  });

  it('returns "" when connectors are undefined (still loading)', () => {
    expect(
      resolveDefaultAiConnectorId({
        connectors: undefined,
        configuredDefaultConnectorId: 'configured-default',
        storedConnectorId: 'stored',
        hasSpaceId: true,
      })
    ).toBe('');
  });

  it('excludes connectors that are missing secrets from selection', () => {
    const withMissingSecrets = [
      connector('configured-default', { isMissingSecrets: true }),
      connector('stored', { isMissingSecrets: true }),
      connector('valid'),
    ];
    expect(
      resolveDefaultAiConnectorId({
        connectors: withMissingSecrets,
        configuredDefaultConnectorId: 'configured-default',
        storedConnectorId: 'stored',
        hasSpaceId: true,
      })
    ).toBe('valid');
  });

  it('does not select a missing-secrets configured default, falling through to stored', () => {
    const list = [
      connector('configured-default', { isMissingSecrets: true }),
      connector('stored'),
      connector('first'),
    ];
    expect(
      resolveDefaultAiConnectorId({
        connectors: list,
        configuredDefaultConnectorId: 'configured-default',
        storedConnectorId: 'stored',
        hasSpaceId: true,
      })
    ).toBe('stored');
  });
});
