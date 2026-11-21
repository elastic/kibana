/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as common from '@kbn/cloud-security-posture-common';
import {
  KNOWLEDGE_ID_MAX_LENGTH,
  KNOWLEDGE_ID_PATTERN,
  knowledgeReleaseToken,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { advisoryKnowledgeId, cveKnowledgeId, KNOWLEDGE_INDEX, releaseToken } from './constants';

const globToRegExp = (pattern: string): RegExp =>
  new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

describe('knowledge index name', () => {
  const patterns = Object.entries(common)
    .filter(([name, value]) => /^CDR_.*VULNERABILITIES.*/.test(name) && typeof value === 'string')
    .flatMap(([name, value]) => (value as string).split(',').map((pattern) => ({ name, pattern })))
    .filter(({ name }) => /INDEX/.test(name));

  it('finds the CNVM index patterns it guards against', () => {
    expect(patterns.length).toBeGreaterThanOrEqual(4);
  });

  it.each(patterns)('is not matched by $name ($pattern)', ({ pattern }) => {
    expect(globToRegExp(pattern).test(KNOWLEDGE_INDEX)).toBe(false);
  });
});

describe('knowledge ids', () => {
  it('turns a release into an id-safe token', () => {
    expect(knowledgeReleaseToken('noble')).toBe('noble');
    expect(knowledgeReleaseToken('9')).toBe('9');
    expect(knowledgeReleaseToken('Ubuntu 24.04/LTS')).toBe('ubuntu-24-04-lts');
    expect(knowledgeReleaseToken('  --  ')).toBe('unknown');
    expect(knowledgeReleaseToken('')).toBe('unknown');
    expect(releaseToken).toBe(knowledgeReleaseToken);
  });

  it('keeps the token within the id pattern even for hostile input', () => {
    expect(knowledgeReleaseToken('a'.repeat(100))).toHaveLength(16);
    expect(knowledgeReleaseToken('x:../y')).toBe('x-y');
  });

  it('builds ids that carry the release and satisfy the shared id pattern', () => {
    const pattern = new RegExp(KNOWLEDGE_ID_PATTERN);
    const ids = [
      cveKnowledgeId('ubuntu', 'noble', 'CVE-2024-0001'),
      cveKnowledgeId('redhat', '9', 'CVE-2024-0001'),
      advisoryKnowledgeId('redhat', '10', 'RHSA-2024:0001'),
      advisoryKnowledgeId('ubuntu', 'jammy', 'USN-1234-1'),
    ];
    for (const id of ids) {
      expect(id).toMatch(pattern);
      expect(id.length).toBeLessThanOrEqual(KNOWLEDGE_ID_MAX_LENGTH);
    }
    expect(ids[0]).toBe('cve:ubuntu:noble:CVE-2024-0001');
    expect(cveKnowledgeId('redhat', '9', 'CVE-1')).not.toBe(
      cveKnowledgeId('redhat', '10', 'CVE-1')
    );
  });
});
