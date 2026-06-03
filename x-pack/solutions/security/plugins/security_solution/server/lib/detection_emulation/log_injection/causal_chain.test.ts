/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCausalChain, buildSequenceChains, selectAncestry } from './causal_chain';

describe('CausalChain', () => {
  describe('selectAncestry', () => {
    it('returns a non-empty ancestry for windows', () => {
      const ancestry = selectAncestry('cmd.exe', 'windows');
      expect(ancestry.length).toBeGreaterThan(0);
    });

    it('returns a non-empty ancestry for linux', () => {
      const ancestry = selectAncestry('bash', 'linux');
      expect(ancestry.length).toBeGreaterThan(0);
    });

    it('returns a non-empty ancestry for macos', () => {
      const ancestry = selectAncestry('zsh', 'macos');
      expect(ancestry.length).toBeGreaterThan(0);
    });
  });

  describe('buildCausalChain', () => {
    it('produces nodes with unique entity IDs', () => {
      const chain = buildCausalChain(
        ['services.exe', 'svchost.exe'],
        'cmd.exe',
        'cmd.exe /c whoami',
        'windows',
        { baseTimestamp: '2024-01-01T00:00:00.000Z' }
      );

      expect(chain.nodes.length).toBe(3);
      const ids = chain.nodes.map((n) => n.entityId);
      expect(new Set(ids).size).toBe(3);
    });

    it('establishes parent→child relationships', () => {
      const chain = buildCausalChain(
        ['init'],
        'bash',
        'bash -c "echo hello"',
        'linux',
        { baseTimestamp: '2024-01-01T00:00:00.000Z' }
      );

      expect(chain.nodes[0].parentEntityId).toBeUndefined();
      expect(chain.nodes[1].parentEntityId).toBe(chain.nodes[0].entityId);
      expect(chain.nodes[1].parentName).toBe('init');
    });

    it('timestamps are monotonically increasing', () => {
      const chain = buildCausalChain(
        ['a', 'b', 'c'],
        'd',
        'd',
        'linux',
        { baseTimestamp: '2024-01-01T00:00:00.000Z', minDelayMs: 100, maxDelayMs: 200 }
      );

      for (let i = 1; i < chain.nodes.length; i++) {
        expect(new Date(chain.nodes[i].timestamp).getTime()).toBeGreaterThan(
          new Date(chain.nodes[i - 1].timestamp).getTime()
        );
      }
    });

    it('uses the target command line only for the leaf node', () => {
      const chain = buildCausalChain(
        ['explorer.exe'],
        'powershell.exe',
        'powershell.exe -EncodedCommand ZWNobyBoZWxsbw==',
        'windows'
      );

      expect(chain.nodes[chain.nodes.length - 1].commandLine).toBe(
        'powershell.exe -EncodedCommand ZWNobyBoZWxsbw=='
      );
      expect(chain.nodes[0].commandLine).toBe('explorer.exe');
    });
  });

  describe('buildSequenceChains', () => {
    it('produces one chain per event spec', () => {
      const chains = buildSequenceChains([
        { targetProcess: 'cmd.exe', targetCommandLine: 'cmd.exe /c dir', os: 'windows' },
        { targetProcess: 'powershell.exe', targetCommandLine: 'powershell.exe -c "ls"', os: 'windows' },
      ]);

      expect(chains.length).toBe(2);
    });

    it('chains have increasing base timestamps', () => {
      const chains = buildSequenceChains(
        [
          { targetProcess: 'a', targetCommandLine: 'a', os: 'linux' },
          { targetProcess: 'b', targetCommandLine: 'b', os: 'linux' },
        ],
        { baseTimestamp: '2024-01-01T00:00:00.000Z', interEventDelayMs: 5000 }
      );

      const t0 = new Date(chains[0].nodes[0].timestamp).getTime();
      const t1 = new Date(chains[1].nodes[0].timestamp).getTime();
      expect(t1).toBeGreaterThan(t0);
    });
  });
});
