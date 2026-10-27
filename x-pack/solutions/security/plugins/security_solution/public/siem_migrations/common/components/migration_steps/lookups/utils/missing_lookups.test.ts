/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceData } from '../../../../../../../common/siem_migrations/model/common.gen';
import { assertMissingLookups } from './missing_lookups';

const missingLookups = ['threat_intel_ip'];

const resource = (name: string): SiemMigrationResourceData => ({
  type: 'lookup',
  name,
  content: 'ip\n1.1.1.1\n',
});

describe('assertMissingLookups', () => {
  it('keeps a name that matches the list exactly', () => {
    const addError = jest.fn();

    expect(assertMissingLookups([resource('threat_intel_ip')], missingLookups, addError)).toEqual([
      resource('threat_intel_ip'),
    ]);
    expect(addError).not.toHaveBeenCalled();
  });

  it('rejects a name that differs only by case', () => {
    const addError = jest.fn();

    expect(assertMissingLookups([resource('Threat_Intel_IP')], missingLookups, addError)).toEqual(
      []
    );
    expect(addError).toHaveBeenCalledWith(
      'The file name must match one of the lookup names in the list above.'
    );
  });
});
