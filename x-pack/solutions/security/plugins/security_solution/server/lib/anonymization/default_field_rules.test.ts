/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultAlertFieldRules } from './default_field_rules';

describe('getDefaultAlertFieldRules', () => {
  const rules = getDefaultAlertFieldRules();

  it('returns more than 140 field rules', () => {
    expect(rules.length).toBeGreaterThan(140);
  });

  it('returns allowed=true for standard ECS fields', () => {
    const timestampRule = rules.find((r) => r.field === '@timestamp');

    expect(timestampRule).toEqual(
      expect.objectContaining({
        allowed: true,
        anonymized: false,
      })
    );
  });

  it('returns anonymized=true with entity class for host.name', () => {
    const hostNameRule = rules.find((r) => r.field === 'host.name');

    expect(hostNameRule).toEqual(
      expect.objectContaining({
        allowed: true,
        anonymized: true,
        entityClass: 'HOST_NAME',
      })
    );
  });

  it('returns anonymized=true with entity class for user.name', () => {
    const userNameRule = rules.find((r) => r.field === 'user.name');

    expect(userNameRule).toEqual(
      expect.objectContaining({
        allowed: true,
        anonymized: true,
        entityClass: 'USER_NAME',
      })
    );
  });

  it('returns anonymized=true for host.ip even though it is not in DEFAULT_ALLOW', () => {
    const hostIpRule = rules.find((r) => r.field === 'host.ip');

    expect(hostIpRule).toEqual(
      expect.objectContaining({
        anonymized: true,
        entityClass: 'IP',
      })
    );
  });

  it('returns entity class for all anonymized fields', () => {
    const anonymizedWithoutClass = rules.filter((r) => r.anonymized && !r.entityClass);

    expect(anonymizedWithoutClass).toHaveLength(0);
  });
});
