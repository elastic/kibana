/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkStrategy, buildNetworkNarrative } from './network_strategy';

describe('networkStrategy', () => {
  describe('match', () => {
    it('returns true for network category without DNS fields', () => {
      expect(
        networkStrategy.match({
          event: { category: ['network'] },
          source: { ip: ['10.0.0.1'] },
        })
      ).toBe(true);
    });

    it('returns false when DNS fields are present', () => {
      expect(
        networkStrategy.match({
          event: { category: ['network'] },
          dns: { question: { name: ['example.com'] } },
        })
      ).toBe(false);
    });
  });

  describe('buildNetworkNarrative', () => {
    it('builds a full network narrative', () => {
      const text = buildNetworkNarrative({
        event: { category: ['network'], action: ['connection_attempted'] },
        source: { ip: ['10.0.0.5'], port: [49152] },
        destination: { ip: ['185.220.101.1'], port: [443] },
        network: {
          protocol: ['https'],
          transport: ['tcp'],
          direction: ['outbound'],
          bytes: [42000],
        },
        process: { name: ['firefox'] },
        user: { name: ['alice'] },
        host: { name: ['laptop-1'] },
        kibana: {
          alert: { severity: ['high'], rule: { name: ['Connection to Known C2'] } },
        },
      });

      expect(text).toBe(
        'Network outbound connection (connection_attempted) from 10.0.0.5:49152 to 185.220.101.1:443 via tcp/https (42000 bytes) process firefox by alice on laptop-1 created high alert Connection to Known C2.'
      );
    });

    it('handles minimal network data', () => {
      expect(
        buildNetworkNarrative({
          event: { category: ['network'] },
          source: { ip: ['10.0.0.1'] },
          destination: { ip: ['10.0.0.2'] },
        })
      ).toBe('Network connection from 10.0.0.1 to 10.0.0.2');
    });
  });
});
