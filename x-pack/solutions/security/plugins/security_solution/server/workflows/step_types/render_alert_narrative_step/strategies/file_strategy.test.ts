/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fileStrategy, buildFileNarrative } from './file_strategy';

describe('fileStrategy', () => {
  describe('match', () => {
    it('returns true for file events without process context', () => {
      expect(
        fileStrategy.match({ event: { category: ['file'] }, file: { name: ['test.txt'] } })
      ).toBe(true);
    });

    it('returns false when a process is present', () => {
      expect(
        fileStrategy.match({
          event: { category: ['file'] },
          file: { name: ['test.txt'] },
          process: { name: ['vim'] },
        })
      ).toBe(false);
    });
  });

  describe('buildFileNarrative', () => {
    it('builds a full file narrative', () => {
      const text = buildFileNarrative({
        event: { category: ['file'], action: ['creation'] },
        file: {
          name: ['evil.exe'],
          path: ['C:\\Users\\admin\\Downloads\\evil.exe'],
          hash: { sha256: ['abc123def456'] },
          extension: ['exe'],
          size: [2048],
        },
        user: { name: ['admin'] },
        host: { name: ['workstation-1'] },
        kibana: {
          alert: { severity: ['critical'], rule: { name: ['Malware File Created'] } },
        },
      });

      expect(text).toBe(
        'File creation C:\\Users\\admin\\Downloads\\evil.exe (exe), 2048 bytes sha256:abc123def456 by admin on workstation-1 created critical alert Malware File Created.'
      );
    });

    it('uses file.name when file.path is absent', () => {
      expect(
        buildFileNarrative({
          event: { category: ['file'], action: ['deletion'] },
          file: { name: ['config.yaml'] },
          host: { name: ['server-1'] },
        })
      ).toBe('File deletion config.yaml on server-1');
    });

    it('handles minimal file data', () => {
      expect(
        buildFileNarrative({ event: { category: ['file'] }, file: { name: ['unknown.dat'] } })
      ).toBe('File event unknown.dat');
    });
  });
});
