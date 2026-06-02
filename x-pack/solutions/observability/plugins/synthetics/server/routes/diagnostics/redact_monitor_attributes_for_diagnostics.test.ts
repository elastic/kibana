/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ConfigKey, LegacyConfigKey } from '../../../common/constants/monitor_management';
import {
  countMonitorsByLocationId,
  redactMonitorAttributesForDiagnostics,
} from './redact_monitor_attributes_for_diagnostics';

describe('redactMonitorAttributesForDiagnostics', () => {
  it('removes encrypted secrets payload and secret field keys', () => {
    const input = {
      [ConfigKey.NAME]: 'test',
      [ConfigKey.USERNAME]: 'user',
      [ConfigKey.PASSWORD]: 'secret',
      secrets: '{"password":"x"}',
    };
    const out = redactMonitorAttributesForDiagnostics(input);
    expect(out[ConfigKey.NAME]).to.eql('test');
    expect((out as Record<string, unknown>)[ConfigKey.USERNAME]).to.eql(undefined);
    expect((out as Record<string, unknown>)[ConfigKey.PASSWORD]).to.eql(undefined);
    expect((out as Record<string, unknown>).secrets).to.eql(undefined);
  });

  it('removes selected legacy zip / TLS secret fields', () => {
    const input = {
      [LegacyConfigKey.SOURCE_ZIP_USERNAME]: 'u',
      [LegacyConfigKey.SOURCE_ZIP_PASSWORD]: 'p',
      [LegacyConfigKey.SOURCE_ZIP_FOLDER]: 'folder',
    };
    const out = redactMonitorAttributesForDiagnostics(input);
    expect((out as Record<string, unknown>)[LegacyConfigKey.SOURCE_ZIP_USERNAME]).to.eql(undefined);
    expect((out as Record<string, unknown>)[LegacyConfigKey.SOURCE_ZIP_PASSWORD]).to.eql(undefined);
    expect((out as Record<string, unknown>)[LegacyConfigKey.SOURCE_ZIP_FOLDER]).to.eql('folder');
  });
});

describe('countMonitorsByLocationId', () => {
  it('aggregates monitors per location id', () => {
    const monitors = [
      {
        attributes: {
          [ConfigKey.LOCATIONS]: [{ id: 'loc-a' }, { id: 'loc-b' }],
        },
      },
      {
        attributes: {
          [ConfigKey.LOCATIONS]: [{ id: 'loc-a' }],
        },
      },
    ];
    const counts = countMonitorsByLocationId(monitors).sort((a, b) =>
      a.locationId.localeCompare(b.locationId)
    );
    expect(counts).to.eql([
      { locationId: 'loc-a', monitorCount: 2 },
      { locationId: 'loc-b', monitorCount: 1 },
    ]);
  });
});
