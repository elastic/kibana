/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceData } from '../../../../../../../common/siem_migrations/model/common.gen';
import { MigrationSource } from '../../../../types';
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

    expect(
      assertMissingLookups(
        [resource('threat_intel_ip')],
        missingLookups,
        MigrationSource.SPLUNK,
        addError
      )
    ).toEqual([resource('threat_intel_ip')]);
    expect(addError).not.toHaveBeenCalled();
  });

  it('rejects a name that differs only by case', () => {
    const addError = jest.fn();

    expect(
      assertMissingLookups(
        [resource('Threat_Intel_IP')],
        missingLookups,
        MigrationSource.SPLUNK,
        addError
      )
    ).toEqual([]);
    expect(addError).toHaveBeenCalledWith(
      'The file name must match one of the lookup names in the list above.'
    );
  });

  it('rejects a QRadar name that is not in the list and names the reference set', () => {
    const addError = jest.fn();

    expect(
      assertMissingLookups(
        [resource('other_set')],
        missingLookups,
        MigrationSource.QRADAR,
        addError
      )
    ).toEqual([]);
    expect(addError).toHaveBeenCalledWith(
      'Reference set "other_set" must match a name in the list above. The name comes from the export, or from the file name when the export has none.'
    );
  });

  it('rejects a Sentinel name that is not in the list and names the watchlist', () => {
    const addError = jest.fn();

    expect(
      assertMissingLookups(
        [resource('other_watchlist')],
        missingLookups,
        MigrationSource.SENTINEL,
        addError
      )
    ).toEqual([]);
    expect(addError).toHaveBeenCalledWith(
      'Watchlist "other_watchlist" must match a name in the list above. The name is taken from the watchlist alias, not the file name.'
    );
  });
});
