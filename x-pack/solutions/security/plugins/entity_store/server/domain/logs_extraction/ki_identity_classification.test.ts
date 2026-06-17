/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildIdentityClassificationPrelude,
  deriveKiClassifiedDefinition,
} from './ki_identity_classification';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { isSingleFieldIdentity } from '../../../common/domain/definitions/entity_schema';

describe('buildIdentityClassificationPrelude', () => {
  it('builds a per-source CASE prelude over _index', () => {
    const prelude = buildIdentityClassificationPrelude([
      { indexPatterns: ['logs-okta.system-default'], namespace: 'okta', tier: 'high' },
      { indexPatterns: ['logs-endpoint.events.*'], namespace: 'local', tier: 'medium' },
    ]);
    expect(prelude).toContain('entity.namespace = CASE(');
    expect(prelude).toContain('_index LIKE "*logs-okta.system-default*"');
    // trailing wildcard is stripped before wrapping
    expect(prelude).toContain('_index LIKE "*logs-endpoint.events.*"');
    expect(prelude).toContain('"okta"');
    expect(prelude).toContain('"local"');
    expect(prelude).toContain('entity.confidence = CASE(');
    expect(prelude).toContain('"high"');
    expect(prelude).toContain('"medium"');
    expect(prelude).toContain(', "unknown")');
    expect(prelude).toContain(', NULL)');
  });

  it('ORs multiple index patterns for one source', () => {
    const prelude = buildIdentityClassificationPrelude([
      {
        indexPatterns: ['logs-okta.system-default', 'logs-okta.eventlog-default'],
        namespace: 'okta',
        tier: 'high',
      },
    ]);
    expect(prelude).toContain(
      '(_index LIKE "*logs-okta.system-default*" OR _index LIKE "*logs-okta.eventlog-default*")'
    );
  });

  it('preserves stored namespace/confidence for the updates data stream', () => {
    const prelude = buildIdentityClassificationPrelude([
      { indexPatterns: ['logs-okta.system-default'], namespace: 'okta', tier: 'high' },
    ]);
    // re-extracted entities (updates stream) keep their stamped values rather
    // than fall to the unclassified default
    expect(prelude).toContain('_index LIKE "*.entities.v2.updates*", entity.namespace');
    expect(prelude).toContain('_index LIKE "*.entities.v2.updates*", entity.confidence');
    expect(prelude).toContain(', "unknown")');
    expect(prelude).toContain(', NULL)');
  });

  it('defaults to unknown/null (with updates guard) for an empty classification list', () => {
    const prelude = buildIdentityClassificationPrelude([]);
    // even with nothing classified, the updates stream is preserved and every
    // other source falls to the unclassified default
    expect(prelude).toContain('entity.namespace = CASE(');
    expect(prelude).toContain('_index LIKE "*.entities.v2.updates*", entity.namespace');
    expect(prelude).toContain(', "unknown")');
    expect(prelude).toContain('entity.confidence = CASE(');
    expect(prelude).toContain('_index LIKE "*.entities.v2.updates*", entity.confidence');
    expect(prelude).toContain(', NULL)');
  });
});

describe('deriveKiClassifiedDefinition', () => {
  const base = getEntityDefinition('user', 'default');

  it('removes the namespace identityField.fieldEvaluations allowlist', () => {
    const derived = deriveKiClassifiedDefinition(base);
    expect(isSingleFieldIdentity(derived.identityField)).toBe(false);
    if (!isSingleFieldIdentity(derived.identityField)) {
      expect(derived.identityField.fieldEvaluations).toBeUndefined();
    }
  });

  it('strips entity.confidence from after-stats overrides but keeps entity.name entries', () => {
    const derived = deriveKiClassifiedDefinition(base);
    const afterStats = derived.whenConditionTrueSetFieldsAfterStats ?? [];
    const allFields = afterStats.flatMap((entry) => Object.keys(entry.fields));
    expect(allFields).not.toContain('entity.confidence');
    expect(allFields).toContain('entity.name');
  });

  it('replaces the idpGate creation gate with a noise-filter-only postAggFilter', () => {
    const derived = deriveKiClassifiedDefinition(base);
    expect(derived.postAggFilter).toBeDefined();
    const serialized = JSON.stringify(derived.postAggFilter);
    // host.id guard + service-account exclusion retained for the local tier
    expect(serialized).toContain('host.id');
    expect(serialized).toContain('entity.namespace');
  });

  it('drops unclassified (unknown namespace) rows in the creation gate', () => {
    const derived = deriveKiClassifiedDefinition(base);
    const serialized = JSON.stringify(derived.postAggFilter);
    // new rows left on the unclassified default namespace are excluded
    expect(serialized).toContain('"neq":"unknown"');
  });

  it('leaves the base definition untouched (reversibility)', () => {
    const before = JSON.stringify(base);
    deriveKiClassifiedDefinition(base);
    expect(JSON.stringify(base)).toEqual(before);
  });
});
