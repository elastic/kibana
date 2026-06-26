/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOriginalAlertIds } from './helpers';

describe('getOriginalAlertIds', () => {
  it('should return original alert IDs based on replacements', () => {
    const alertIds = ['alert-1', 'alert-2', 'alert-3'];
    const replacements = {
      'alert-1': 'original-1',
      'alert-2': 'original-2',
    };

    const result = getOriginalAlertIds(alertIds, replacements);

    expect(result).toEqual(['original-1', 'original-2', 'alert-3']);
  });

  it('should return the same IDs if no replacements provided', () => {
    const alertIds = ['alert-1', 'alert-2'];

    const result = getOriginalAlertIds(alertIds);

    expect(result).toEqual(['alert-1', 'alert-2']);
  });

  it('should handle empty alertIds arrays', () => {
    const alertIds: string[] = [];
    const replacements = {
      'alert-1': 'original-1',
    };

    const result = getOriginalAlertIds(alertIds, replacements);

    expect(result).toEqual([]);
  });

  it('should handle missing matches in replacements gracefully', () => {
    const alertIds = ['alert-1', 'alert-2'];
    const replacements = {
      'alert-3': 'original-3',
    };

    const result = getOriginalAlertIds(alertIds, replacements);

    expect(result).toEqual(['alert-1', 'alert-2']);
  });
});
