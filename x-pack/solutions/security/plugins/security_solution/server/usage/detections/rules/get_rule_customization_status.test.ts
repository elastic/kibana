/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialRuleCustomizationStatus } from './get_initial_usage';
import type { ExternalRuleSourceInfo } from './get_rule_customization_status';
import {
  getRuleCustomizationMissingBaseVersionStatus,
  getRuleCustomizationStatus,
} from './get_rule_customization_status';

describe('getRuleCustomizationStatus', () => {
  it('returns zeroed counts for an empty list', () => {
    expect(getRuleCustomizationStatus([])).toEqual(getInitialRuleCustomizationStatus());
  });

  it('counts customized fields across customized rules only', () => {
    const ruleSources: ExternalRuleSourceInfo[] = [
      createRuleSource({ is_customized: true, customized_fields: ['name', 'query'] }),
      createRuleSource({ is_customized: true, customized_fields: ['query'] }),
      createRuleSource({ is_customized: false, customized_fields: ['severity'] }),
    ];

    expect(getRuleCustomizationStatus(ruleSources)).toEqual({
      ...getInitialRuleCustomizationStatus(),
      name: 1,
      query: 2,
    });
  });

  it('ignores customized fields outside the allowed list', () => {
    const ruleSources: ExternalRuleSourceInfo[] = [
      createRuleSource({ is_customized: true, customized_fields: ['name', 'author', 'version'] }),
    ];

    expect(getRuleCustomizationStatus(ruleSources)).toEqual({
      ...getInitialRuleCustomizationStatus(),
      name: 1,
    });
  });

  it('counts customized fields regardless of base version presence', () => {
    const ruleSources: ExternalRuleSourceInfo[] = [
      createRuleSource({
        is_customized: true,
        has_base_version: false,
        customized_fields: ['name'],
      }),
    ];

    expect(getRuleCustomizationStatus(ruleSources)).toEqual({
      ...getInitialRuleCustomizationStatus(),
      name: 1,
    });
  });
});

describe('getRuleCustomizationMissingBaseVersionStatus', () => {
  it('returns zeroed counts for an empty list', () => {
    expect(getRuleCustomizationMissingBaseVersionStatus([])).toEqual(
      getInitialRuleCustomizationStatus()
    );
  });

  it('counts customized fields of customized rules without a base version only', () => {
    const ruleSources: ExternalRuleSourceInfo[] = [
      createRuleSource({
        is_customized: true,
        has_base_version: false,
        customized_fields: ['name', 'query'],
      }),
      createRuleSource({
        is_customized: true,
        has_base_version: false,
        customized_fields: ['query'],
      }),
      createRuleSource({
        is_customized: true,
        has_base_version: true,
        customized_fields: ['query', 'severity'],
      }),
      createRuleSource({
        is_customized: false,
        has_base_version: false,
        customized_fields: [],
      }),
    ];

    expect(getRuleCustomizationMissingBaseVersionStatus(ruleSources)).toEqual({
      ...getInitialRuleCustomizationStatus(),
      name: 1,
      query: 2,
    });
  });

  it('ignores customized fields outside the allowed list', () => {
    const ruleSources: ExternalRuleSourceInfo[] = [
      createRuleSource({
        is_customized: true,
        has_base_version: false,
        customized_fields: ['name', 'author'],
      }),
    ];

    expect(getRuleCustomizationMissingBaseVersionStatus(ruleSources)).toEqual({
      ...getInitialRuleCustomizationStatus(),
      name: 1,
    });
  });
});

interface CreateRuleSourceParams {
  is_customized: boolean;
  customized_fields: string[];
  has_base_version?: boolean;
}

function createRuleSource({
  is_customized,
  customized_fields,
  has_base_version = true,
}: CreateRuleSourceParams): ExternalRuleSourceInfo {
  return {
    is_customized,
    has_base_version,
    customized_fields: customized_fields.map((fieldName) => ({ fieldName })),
  };
}
