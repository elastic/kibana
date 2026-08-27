/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createMockEndpointAppContextService } from '../../endpoint/mocks';
import { getEndpointAuthzInitialStateMock } from '../../../common/endpoint/service/authz/mocks';
import { validateProtectedPolicySettings } from './validate_protected_policy_settings';

const mockRequest = {} as KibanaRequest;

const buildArgs = (
  overrides: Partial<Parameters<typeof validateProtectedPolicySettings>[0]> = {}
) => ({
  newPolicyValue: undefined,
  currentPolicyValue: undefined,
  endpointServices: createMockEndpointAppContextService(),
  request: mockRequest,
  logger: loggingSystemMock.createLogger(),
  ...overrides,
});

describe('validateProtectedPolicySettings', () => {
  it('allows update when request is absent (internal/background caller)', async () => {
    const args = buildArgs({ request: undefined });
    await expect(validateProtectedPolicySettings(args)).resolves.toBeUndefined();
  });

  it('allows update when no protected setting is changed', async () => {
    const endpointServices = createMockEndpointAppContextService();
    // Even non-superuser should be allowed when nothing protected changed
    (endpointServices.getEndpointAuthz as jest.Mock).mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canWriteAdminData: false })
    );
    const policyValue = {
      windows: { malware: { mode: 'prevent' }, advanced: {} },
    };
    const args = buildArgs({
      newPolicyValue: policyValue as unknown as Record<string, unknown>,
      currentPolicyValue: policyValue as unknown as Record<string, unknown>,
      endpointServices,
    });
    await expect(validateProtectedPolicySettings(args)).resolves.toBeUndefined();
  });

  it('allows update of unrelated advanced setting for non-superuser', async () => {
    const endpointServices = createMockEndpointAppContextService();
    (endpointServices.getEndpointAuthz as jest.Mock).mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canWriteAdminData: false })
    );
    const current = {
      windows: { advanced: { some_other_setting: 'old' } },
    };
    const next = {
      windows: { advanced: { some_other_setting: 'new' } },
    };
    const args = buildArgs({
      newPolicyValue: next as unknown as Record<string, unknown>,
      currentPolicyValue: current as unknown as Record<string, unknown>,
      endpointServices,
    });
    await expect(validateProtectedPolicySettings(args)).resolves.toBeUndefined();
  });

  describe.each([
    ['windows.advanced.artifacts.global.public_key', 'windows', 'global', 'public_key'],
    ['windows.advanced.artifacts.global.base_url', 'windows', 'global', 'base_url'],
    [
      'windows.advanced.artifacts.global.manifest_relative_url',
      'windows',
      'global',
      'manifest_relative_url',
    ],
    ['windows.advanced.artifacts.global.ca_cert', 'windows', 'global', 'ca_cert'],
    ['windows.advanced.artifacts.global.proxy_url', 'windows', 'global', 'proxy_url'],
    ['windows.advanced.artifacts.global.proxy_disable', 'windows', 'global', 'proxy_disable'],
    ['windows.advanced.artifacts.user.public_key', 'windows', 'user', 'public_key'],
    ['mac.advanced.artifacts.global.public_key', 'mac', 'global', 'public_key'],
    ['linux.advanced.artifacts.global.public_key', 'linux', 'global', 'public_key'],
  ])('protected field %s', (path, os, artifactType, field) => {
    const buildPolicyWithField = (value: string | undefined) => ({
      [os]: {
        advanced: {
          artifacts: {
            [artifactType]: {
              [field]: value,
            },
          },
        },
      },
    });

    it('throws 403 with apiPassThrough when non-superuser changes the field', async () => {
      const endpointServices = createMockEndpointAppContextService();
      (endpointServices.getEndpointAuthz as jest.Mock).mockResolvedValue(
        getEndpointAuthzInitialStateMock({ canWriteAdminData: false })
      );
      const args = buildArgs({
        newPolicyValue: buildPolicyWithField('http://attacker.evil') as Record<string, unknown>,
        currentPolicyValue: buildPolicyWithField(undefined) as Record<string, unknown>,
        endpointServices,
      });
      const err = await validateProtectedPolicySettings(args).catch((e) => e);
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(403);
      expect(err.apiPassThrough).toBe(true);
      expect(err.message).toMatch(path);
    });

    it('allows superuser to change the field', async () => {
      const endpointServices = createMockEndpointAppContextService();
      (endpointServices.getEndpointAuthz as jest.Mock).mockResolvedValue(
        getEndpointAuthzInitialStateMock({ canWriteAdminData: true })
      );
      const args = buildArgs({
        newPolicyValue: buildPolicyWithField('http://custom.server') as Record<string, unknown>,
        currentPolicyValue: buildPolicyWithField(undefined) as Record<string, unknown>,
        endpointServices,
      });
      await expect(validateProtectedPolicySettings(args)).resolves.toBeUndefined();
    });

    it('allows non-superuser when the field value is unchanged', async () => {
      const endpointServices = createMockEndpointAppContextService();
      (endpointServices.getEndpointAuthz as jest.Mock).mockResolvedValue(
        getEndpointAuthzInitialStateMock({ canWriteAdminData: false })
      );
      // Use separate object literals (not the same reference) so isEqual is genuinely exercised
      const args = buildArgs({
        newPolicyValue: buildPolicyWithField('http://existing.server') as Record<string, unknown>,
        currentPolicyValue: buildPolicyWithField('http://existing.server') as Record<
          string,
          unknown
        >,
        endpointServices,
      });
      await expect(validateProtectedPolicySettings(args)).resolves.toBeUndefined();
    });
  });

  it('throws 403 listing all changed protected fields in the error message', async () => {
    const endpointServices = createMockEndpointAppContextService();
    (endpointServices.getEndpointAuthz as jest.Mock).mockResolvedValue(
      getEndpointAuthzInitialStateMock({ canWriteAdminData: false })
    );
    const current = {};
    const next = {
      windows: {
        advanced: {
          artifacts: {
            global: {
              public_key: 'attacker-key',
              base_url: 'http://attacker.evil',
            },
          },
        },
      },
    };
    const args = buildArgs({
      newPolicyValue: next as Record<string, unknown>,
      currentPolicyValue: current as Record<string, unknown>,
      endpointServices,
    });
    const err = await validateProtectedPolicySettings(args).catch((e) => e);
    expect(err.statusCode).toBe(403);
    expect(err.apiPassThrough).toBe(true);
    expect(err.message).toContain('windows.advanced.artifacts.global.public_key');
    expect(err.message).toContain('windows.advanced.artifacts.global.base_url');
  });
});
