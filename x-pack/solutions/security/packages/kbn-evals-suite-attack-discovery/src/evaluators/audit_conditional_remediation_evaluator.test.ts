/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAuditConditionalRemediationEvaluator,
  findUnconditionalContainment,
} from './audit_conditional_remediation_evaluator';
import { emptyInput, makeDiscovery, makeGold, makeOutput } from './audit_test_utils';

describe('findUnconditionalContainment', () => {
  it.each([
    'Revoke the access key for {{ user.name alice }}.',
    '- Immediately isolate {{ host.name web-1 }} from the network',
    'Recommended action: rotate the credentials',
    'The team should disable the account.',
    'We recommend that you block the IP address.',
    '**Terminate** the session',
  ])('flags unconditional advice: %s', (text) => {
    expect(findUnconditionalContainment(text)).toHaveLength(1);
  });

  it.each([
    'If confirmed malicious, revoke the access key.',
    'Revoke the key only if the activity is unauthorized.',
    'Once you have verified the login, rotate the credentials.',
    'Consider disabling the account.',
    'Rotate the key unless the owner confirms the activity.',
  ])('does not flag conditional advice: %s', (text) => {
    expect(findUnconditionalContainment(text)).toEqual([]);
  });

  it('does not flag past tense or descriptive text', () => {
    expect(
      findUnconditionalContainment('The key was revoked. The attacker disabled logging.')
    ).toEqual([]);
  });

  it('does not flag a verb that only appears inside an entity token', () => {
    expect(
      findUnconditionalContainment('Seen {{ rule.name Block Public Access Disabled }}')
    ).toEqual([]);
  });

  it('treats a list under a conditional header as conditional', () => {
    const markdown =
      'If the activity is confirmed unauthorized:\n- Revoke the key\n- Disable the user';
    expect(findUnconditionalContainment(markdown)).toEqual(['Disable the user']);
  });
});

describe('ConditionalRemediation evaluator', () => {
  const evaluator = createAuditConditionalRemediationEvaluator();

  const run = (confirmed: boolean, detailsMarkdown: string | null) =>
    evaluator.evaluate({
      input: emptyInput,
      output: makeOutput(detailsMarkdown === null ? [] : [makeDiscovery({ detailsMarkdown })]),
      expected: undefined,
      metadata: { gold: makeGold({ confirmed }) },
    } as never);

  it('scores 0 for unconditional containment when the finding is unconfirmed', async () => {
    const result = await run(false, '- Revoke the access key immediately.');
    expect(result).toMatchObject({ score: 0, label: 'unconditional_containment' });
  });

  it('scores 1 when containment is conditional', async () => {
    const result = await run(false, '- If confirmed unauthorized, revoke the access key.');
    expect(result).toMatchObject({ score: 1, label: 'conditional_or_none' });
  });

  it('scores 1 when there is no containment advice', async () => {
    expect(await run(false, '- A console login occurred.')).toMatchObject({ score: 1 });
  });

  it('is N/A for confirmed scenarios', async () => {
    expect(await run(true, '- Revoke the key.')).toMatchObject({ score: null, label: 'N/A' });
  });

  it('is N/A when there are no discoveries', async () => {
    expect(await run(false, null)).toMatchObject({ score: null, label: 'N/A' });
  });
});
