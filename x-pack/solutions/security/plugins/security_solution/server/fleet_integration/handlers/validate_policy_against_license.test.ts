/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { validatePolicyAgainstLicense } from './validate_policy_against_license';
import { LicenseService } from '../../../common/license';
import { policyFactory } from '../../../common/endpoint/models/policy_config';

describe('validatePolicyAgainstLicense', () => {
  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Enterprise = licenseMock.createLicense({ license: { type: 'enterprise' } });

  let licenseEmitter: Subject<ILicense>;
  let licenseService: LicenseService;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);
    logger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    licenseService.stop();
    licenseEmitter.complete();
  });

  it('does not throw when the policy is valid for the license', () => {
    licenseEmitter.next(Enterprise);

    expect(() =>
      validatePolicyAgainstLicense(policyFactory(), licenseService, logger)
    ).not.toThrow();
  });

  it('rejects an Enterprise-only field as a pass-through 403 so Fleet does not persist it', () => {
    licenseEmitter.next(Platinum);

    const policy = policyFactory();
    policy.windows.memory_protection.custom_yara_signatures = true;

    let thrown: (Error & { statusCode?: number; apiPassThrough?: boolean }) | undefined;
    try {
      validatePolicyAgainstLicense(policy, licenseService, logger);
    } catch (error) {
      thrown = error;
    }

    expect(thrown?.message).toBe(
      'Platinum license does not support this action. Please upgrade your license.'
    );
    expect(thrown?.statusCode).toBe(403);
    // Fleet only rethrows when this exact property is set; anything else is swallowed and the
    // unsanitized inbound payload is persisted instead.
    expect(thrown?.apiPassThrough).toBe(true);
  });
});
