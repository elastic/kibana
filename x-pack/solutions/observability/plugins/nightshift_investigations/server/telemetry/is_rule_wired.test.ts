/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftTriggerRow } from '../lib/automations/types';
import { isRuleWired, toRuleMatchers } from './is_rule_wired';

const rule = { name: 'checkout latency', tags: ['payments'] };

const isWired = (rows: NightshiftTriggerRow[], isEnabled = true): boolean =>
  isRuleWired(rule, toRuleMatchers([{ isEnabled, trigger: { rows } }]));

describe('isRuleWired', () => {
  it.each<[string, NightshiftTriggerRow, boolean]>([
    ['a row without filters', { kind: 'alert' }, true],
    ['an exact rule name', { kind: 'alert', ruleNames: ['checkout latency'] }, true],
    ['another rule name', { kind: 'alert', ruleNames: ['checkout'] }, false],
    ['a name pattern contained in the name', { kind: 'alert', ruleNamePattern: 'latency' }, true],
    ['a name or a tag', { kind: 'alert', ruleNames: ['other'], tags: ['payments'] }, true],
    [
      'a pattern that matches with a tag that does not',
      { kind: 'alert', ruleNamePattern: 'latency', tags: ['other'] },
      false,
    ],
    ['only a severity filter', { kind: 'alert', severities: ['critical'] }, true],
    ['only other sources', { kind: 'alert', alertSources: ['classic', 'external'] }, false],
    [
      'the internal source excluded',
      { kind: 'alert', alertSources: ['internal'], alertSourceMode: 'exclude' },
      false,
    ],
    [
      'another source excluded',
      { kind: 'alert', alertSources: ['external'], alertSourceMode: 'exclude' },
      true,
    ],
    ['a schedule trigger', { kind: 'schedule' } as NightshiftTriggerRow, false],
  ])('with %s', (_title, row, expected) => {
    expect(isWired([row])).toBe(expected);
  });

  it('ignores disabled automations', () => {
    expect(isWired([{ kind: 'alert' }], false)).toBe(false);
  });
});
