/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import type { CaseAttachment } from './utils';
import { isAttackAttachment, matchesSearchTerm, toReadableAttackIndexPattern } from './utils';

const attackAttachment = {
  type: SECURITY_ATTACK_ATTACHMENT_TYPE,
  attachmentId: 'attack-id-1',
  metadata: {
    title: 'Credential harvesting on host-1',
    alertCount: 4,
    index: '.alerts-security.attack.discovery.alerts-default',
  },
} as unknown as CaseAttachment;

describe('isAttackAttachment', () => {
  it('accepts an attack attachment', () => {
    expect(isAttackAttachment(attackAttachment)).toBe(true);
  });

  it('rejects another attachment type', () => {
    expect(
      isAttackAttachment({
        ...attackAttachment,
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
      } as unknown as CaseAttachment)
    ).toBe(false);
  });

  it('rejects an attachment with an array of ids', () => {
    expect(
      isAttackAttachment({
        ...attackAttachment,
        attachmentId: ['attack-id-1'],
      } as unknown as CaseAttachment)
    ).toBe(false);
  });

  it('rejects an attachment with no metadata', () => {
    expect(
      isAttackAttachment({ ...attackAttachment, metadata: null } as unknown as CaseAttachment)
    ).toBe(false);
  });
});

describe('matchesSearchTerm', () => {
  const attachment = {
    attachmentId: 'attack-id-1',
    metadata: {
      title: 'Credential harvesting on host-1',
      summaryMarkdown: 'An adversary dumped LSASS memory',
      alertCount: 4,
      index: '.alerts-security.attack.discovery.alerts-default',
    },
  };

  it.each([
    ['the title', 'credential'],
    ['the summary', 'lsass'],
    ['the attack id', 'attack-id-1'],
  ])('matches on %s', (_label, searchTerm) => {
    expect(matchesSearchTerm(attachment, searchTerm)).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesSearchTerm(attachment, 'kerberoasting')).toBe(false);
  });

  it('matches when the optional summary is absent', () => {
    const { summaryMarkdown, ...metadata } = attachment.metadata;
    expect(matchesSearchTerm({ ...attachment, metadata }, 'credential')).toBe(true);
  });
});

describe('toReadableAttackIndexPattern', () => {
  it.each([
    ['.internal.alerts-security.attack.discovery.alerts-default-000001'],
    ['.alerts-security.attack.discovery.alerts-default'],
  ])('maps the scheduled index %s to the scheduled alias pattern', (index) => {
    expect(toReadableAttackIndexPattern(index)).toBe('.alerts-security.attack.discovery.alerts-*');
  });

  it.each([
    ['.internal.adhoc.alerts-security.attack.discovery.alerts-default-000001'],
    ['.adhoc.alerts-security.attack.discovery.alerts-default'],
  ])('maps the adhoc index %s to the adhoc alias pattern', (index) => {
    expect(toReadableAttackIndexPattern(index)).toBe(
      '.adhoc.alerts-security.attack.discovery.alerts-*'
    );
  });

  it('passes through an index that belongs to neither attack-discovery family', () => {
    expect(toReadableAttackIndexPattern('.alerts-security.alerts-default')).toBe(
      '.alerts-security.alerts-default'
    );
  });
});
