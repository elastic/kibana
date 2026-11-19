/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registryStrategy, buildRegistryNarrative } from './registry_strategy';

describe('registryStrategy', () => {
  describe('match', () => {
    it('returns true when registry.key is present', () => {
      expect(registryStrategy.match({ registry: { key: ['HKLM\\Software\\Test'] } })).toBe(true);
    });

    it('returns true for endpoint.events.registry dataset', () => {
      expect(registryStrategy.match({ event: { dataset: ['endpoint.events.registry'] } })).toBe(
        true
      );
    });

    it('returns false without registry fields', () => {
      expect(registryStrategy.match({ event: { category: ['process'] } })).toBe(false);
    });
  });

  describe('buildRegistryNarrative', () => {
    it('builds a full registry narrative', () => {
      const text = buildRegistryNarrative({
        event: { action: ['modification'] },
        registry: {
          path: ['HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\malware'],
          key: ['HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'],
          value: ['malware'],
          data: { strings: ['C:\\Windows\\Temp\\evil.exe'] },
        },
        process: { name: ['powershell.exe'] },
        user: { name: ['admin'] },
        host: { name: ['workstation-1'] },
        kibana: {
          alert: { severity: ['high'], rule: { name: ['Registry Run Key Persistence'] } },
        },
      });

      expect(text).toBe(
        'Registry modification on HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\malware value malware data C:\\Windows\\Temp\\evil.exe by process powershell.exe by admin on workstation-1 created high alert Registry Run Key Persistence.'
      );
    });

    it('handles minimal registry data', () => {
      expect(buildRegistryNarrative({ registry: { key: ['HKLM\\Software\\Test'] } })).toBe(
        'Registry event on HKLM\\Software\\Test'
      );
    });
  });
});
