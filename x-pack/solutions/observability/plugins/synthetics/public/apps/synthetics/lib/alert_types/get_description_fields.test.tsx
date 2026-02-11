/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_PREBUILD_DESCRIPTION_FIELDS } from '@kbn/triggers-actions-ui-plugin/public';
import type { Rule, PrebuildFieldsMap } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { HttpSetup } from '@kbn/core/public';
import { getDescriptionFields } from './get_description_fields';
import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';

describe('synthetics getDescriptionFields', () => {
  const indexField = { type: 'indexPattern', value: 'synthetics-*' };
  const mockPrebuildField = jest.fn();
  const mockPrebuildFields = {
    [RULE_PREBUILD_DESCRIPTION_FIELDS.CUSTOM_QUERY]: mockPrebuildField,
    [RULE_PREBUILD_DESCRIPTION_FIELDS.INDEX_PATTERN]: jest.fn().mockReturnValue(indexField),
  } as unknown as PrebuildFieldsMap;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when rule is not provided', () => {
    const result = getDescriptionFields({
      rule: undefined as unknown as Rule<TLSRuleParams>,
      prebuildFields: mockPrebuildFields,
      http: {} as HttpSetup,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when prebuildFields is not provided', () => {
    const mockRule = {
      params: {
        kqlQuery: '_id: *',
      },
    } as unknown as Rule<TLSRuleParams>;

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: undefined,
      http: {} as HttpSetup,
    });

    expect(result).toEqual([]);
  });

  it('should return empty array when both rule and prebuildFields are not provided', () => {
    const result = getDescriptionFields({
      rule: undefined as unknown as Rule<TLSRuleParams>,
      prebuildFields: undefined,
      http: {} as HttpSetup,
    });

    expect(result).toEqual([]);
  });

  it('should return the custom query', () => {
    const mockRule = {
      params: {
        kqlQuery: '_id: *',
      },
    } as unknown as Rule<TLSRuleParams>;

    const mockReturnValue = { type: 'customQuery', value: '_id: *' };
    mockPrebuildField.mockReturnValue(mockReturnValue);

    const result = getDescriptionFields({
      rule: mockRule,
      prebuildFields: mockPrebuildFields,
      http: {} as HttpSetup,
    });

    expect(mockPrebuildField).toHaveBeenCalledWith('_id: *');
    expect(result).toEqual([indexField, mockReturnValue]);
  });
});
