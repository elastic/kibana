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
import {
  emptyInput,
  makeDiscovery,
  makeGold,
  makeOutput,
  resolveReferenceFromMetadata,
} from './audit_test_utils';

describe('findUnconditionalContainment', () => {
  it.each([
    'Revoke the access key for {{ user.name alice }}.',
    '- Immediately isolate {{ host.name web-1 }} from the network',
    'Recommended action: rotate the credentials',
    'The team should disable the account.',
    'We recommend that you block the IP address.',
    '**Terminate** the session',
    // gerund and nominal forms after directives
    'We recommend blocking the IP.',
    'Revoking the access key should be prioritized.',
    'It is critical to revoke the key.',
    // consider is a hedge only before whether/if
    'Consider the account compromised and revoke its keys.',
    'Consider disabling the account.',
    'Rotate credentials if you have not already.',
    // cases beyond the required ones
    'Start by isolating the host from the network.',
    'It is essential that you rotate the secrets today.',
    'Deleting the new IAM user is necessary.',
    'We advise quarantining the workstation.',
    'First, disable the account. Then review the logs.',
    'Make sure to terminate the active sessions.',
    'Prioritize suspending the service account.',
    'Rotate the key when you get a chance.',
    'Block the IP, which appeared in the alert.',
  ])('flags unconditional advice: %s', (text) => {
    expect(findUnconditionalContainment(text)).toHaveLength(1);
  });

  it.each([
    'If confirmed malicious, revoke the access key.',
    'Revoke the key only if the activity is unauthorized.',
    'Once you have verified the login, rotate the credentials.',
    'Rotate the key unless the owner confirms the activity.',
    'Revoke the key if malicious activity continues.',
    'Once you confirm the activity is unauthorized, rotate the credentials.',
    'Consider whether to block the IP after verifying the traffic.',
    // cases beyond the required ones
    'Consider if the account should be disabled once the owner has been contacted and verified.',
    'After investigating the logins, disable the account if they are unauthorized.',
    'Pending validation of the source, block the IP.',
    'Isolate the host only after you determine the process is malicious.',
    'Recommending a review of the logs is reasonable.',
    'The access key was revoked by the owner. The attacker disabled logging.',
    'Review the trail before taking any action.',
  ])('does not flag conditional or non-directive text: %s', (text) => {
    expect(findUnconditionalContainment(text)).toEqual([]);
  });

  it.each([
    // verb not at the start of the sentence
    'To contain the activity, revoke the access keys for deploy-bot.',
    'Given the severity, isolate WS-FIN-214 from the network.',
    'For deploy-bot, rotate all access keys.',
    'Immediate containment: isolate the host and block the C2 IP.',
    'Next steps: Revoke the key.',
    'Recommended next steps include revoking the access key and disabling the user.',
    // widened verbs
    'Reset the password for j.meyer.',
    'Kill the process and remove svc_helper.exe.',
    'Contain the host.',
    'Reimage the workstation.',
    'Wipe the laptop.',
    'Lock the account.',
    'Shut down the server.',
    'Ban the IP address.',
    // until/after/when + investigation is not a confirmation condition
    'Disable the account until the investigation is complete.',
    'Revoke the key after the incident is investigated.',
    'Isolate the host when possible to stop investigation interference.',
    // previously flagged, still flagged
    'The SOC should immediately isolate the host.',
    'Recommended Actions:\n- Revoke the key',
    'Revoke the key, then confirm with the owner.',
  ])('flags unconditional advice anywhere in the sentence: %s', (text) => {
    expect(findUnconditionalContainment(text).length).toBeGreaterThan(0);
  });

  it.each([
    'If confirmed unauthorized:\n- Revoke the key',
    'Once confirmed, revoke the key.',
    'If deemed suspicious, isolate the host.',
    'Should the activity prove malicious, disable the account.',
    // realistic negatives: investigation advice and hedged containment
    'Verify with the account owner whether the key creation was expected before revoking it.',
    'Investigate whether the host is compromised; if so, isolate it.',
    'Verify with the owner that the login was legitimate. If it was not, reset the password.',
    'Check CloudTrail for other actions by the principal and review the key age.',
    'The attacker attempted to disable logging and delete the trail.',
    'Do not block the IP until the owner confirms the traffic is unauthorized.',
  ])('does not flag investigation advice or conditioned containment: %s', (text) => {
    expect(findUnconditionalContainment(text)).toEqual([]);
  });

  describe('past-tense narrative before a coordinated verb', () => {
    it.each([
      'The attacker signed in and reset the MFA device.',
      'The actor logged in, deleted the trail and shut down the logging agent.',
      'The script created a new user and then reset its password.',
    ])('does not flag narrative: %s', (text) => {
      expect(findUnconditionalContainment(text)).toEqual([]);
    });

    it.each([
      'Review the logs and reset the password.',
      'Disable the user and reset the MFA device.',
      'Isolate the host, then shut down the logging agent.',
      'Check the key and rotate it.',
      'Review the affected hosts and isolate them.',
      'Review the logs created by the user and reset the password.',
      'The analyst reviewed the alert; next, check the owner and reset the password.',
    ])('still flags advice: %s', (text) => {
      expect(findUnconditionalContainment(text).length).toBeGreaterThan(0);
    });
  });

  describe('follow-up cues ("if not", "if they did not")', () => {
    it.each([
      'The deploy-bot account is compromised. If it is not already disabled, disable it now.',
      'Activity confirmed malicious by the chain. If not already done, isolate the host.',
      'This is malicious. If it is not isolated yet, isolate the host.',
      'The login was malicious. If not, reset the password.',
      'Verify the login first. If it is not already blocked, block the IP.',
      // a fresh subject or predicate is a new claim, not a pointer back
      'Check the logs. If the user is active, disable the account.',
      'Verify the alert. If the host is still online, isolate it.',
      'Investigate the beacon. If the host is still online, isolate it.',
      'Contact the owner. If the owner has left, disable the account.',
      'Verify the logging configuration. If the trail is still stopped, terminate the session and rotate keys.',
      // only pronoun subjects are elliptical; a noun subject is a new claim
      'Ask the owner whether they created the key. If the owner did not, revoke it.',
      // the previous sentence raises no whether/if/that question
      'Check the key age. If they do, rotate every key.',
      'Check CloudTrail for further activity. If it was, revoke the key anyway.',
      // documented limit: no verify verb to restate
      'Contact the owner. If they did not create it, revoke it.',
    ])('flags an action the cue does not govern: %s', (text) => {
      expect(findUnconditionalContainment(text).length).toBeGreaterThan(0);
    });

    it.each([
      'Contact the owner to verify the key creation; if they did not create it, disable the user.',
      'Verify with the owner that the login was legitimate. If it was not, reset the password.',
      'Ask the owner whether they created the key. If they did not, revoke it.',
      'Check whether the key was created by the owner. If it was not, disable the user.',
      'Investigate whether the host is compromised; if so, isolate it.',
      'Determine whether the traffic is expected. If they are, leave it; if not, block the IP.',
      'Validate with the owner that the change was authorized. If they cannot, suspend the account.',
    ])('honours a cue that follows a verification instruction: %s', (text) => {
      expect(findUnconditionalContainment(text)).toEqual([]);
    });
  });

  describe('descriptive adjectives and timing words are not conditions', () => {
    it.each([
      'Disable the user after the suspicious key creation at 02:14.',
      'Revoke all keys created after the compromise.',
      'Rotate every credential used when the account was compromised.',
      'Block the IP after reviewing the suspicious traffic.',
      'Terminate the instance until it is verified clean.',
    ])('flags: %s', (text) => {
      expect(findUnconditionalContainment(text).length).toBeGreaterThan(0);
    });

    it.each([
      'If it is confirmed malicious, isolate the host.',
      'Should the activity prove malicious, revoke the key.',
      'If deemed suspicious, isolate the host.',
      'Once confirmed, revoke the key.',
      'If confirmed unauthorized:\n- Revoke the key',
    ])('passes: %s', (text) => {
      expect(findUnconditionalContainment(text)).toEqual([]);
    });
  });

  describe('consequence connectives before the verb', () => {
    it.each([
      'The account is compromised, so disable it.',
      'If deploy-bot is still active, it was compromised, so disable it.',
      'The key leaked, therefore rotate it.',
      'The host is beaconing, thus isolate it.',
    ])('flags: %s', (text) => {
      expect(findUnconditionalContainment(text).length).toBeGreaterThan(0);
    });

    it('still passes a connective inside a conditional', () => {
      expect(findUnconditionalContainment('If confirmed malicious, so disable it.')).toEqual([]);
    });
  });

  describe('passive and nominal directives', () => {
    it.each([
      'The prod access key should be revoked immediately.',
      'Access keys for deploy-bot should be rotated and the user disabled.',
      'Revocation of the access key is recommended.',
      'Containment should include isolating the host.',
    ])('flags: %s', (text) => {
      expect(findUnconditionalContainment(text).length).toBeGreaterThan(0);
    });

    it.each([
      'Keys should immediately be revoked.',
      'Removal of the persistence mechanism is required.',
      'Deletion of the new user is recommended.',
    ])('flags: %s', (text) => {
      expect(findUnconditionalContainment(text).length).toBeGreaterThan(0);
    });

    it.each([
      'The key should not be revoked until the owner confirms.',
      'If confirmed, the key should be revoked.',
    ])('passes: %s', (text) => {
      expect(findUnconditionalContainment(text)).toEqual([]);
    });
  });

  it('does not flag a verb that only appears inside an entity token', () => {
    expect(
      findUnconditionalContainment('Seen {{ rule.name Block Public Access Disabled }}')
    ).toEqual([]);
  });

  it('treats a list under a conditional header as conditional', () => {
    const markdown =
      'If the activity is confirmed unauthorized:\n- Revoke the key\n- Disable the user';
    expect(findUnconditionalContainment(markdown)).toEqual([]);
  });

  it('treats a list under a bold conditional header as conditional', () => {
    const markdown =
      '**Recommended actions (if confirmed malicious):**\n1. Revoke the key\n2. Disable the user\n3. Isolate the host';
    expect(findUnconditionalContainment(markdown)).toEqual([]);
  });

  it('documented limits: a conditional split across sentences is flagged', () => {
    expect(findUnconditionalContainment('Verify the login first. Then revoke the key.')).toEqual([
      'Then revoke the key.',
    ]);
  });
});

describe('ConditionalRemediation evaluator', () => {
  const evaluator = createAuditConditionalRemediationEvaluator(resolveReferenceFromMetadata);
  const gold = makeGold({
    alertGroups: { chain: ['c1', 'c2'], other: ['o1'] },
    confirmedGroups: ['chain'],
  });

  const run = (alertIds: string[], detailsMarkdown: string | null, g = gold) =>
    evaluator.evaluate({
      input: emptyInput,
      output: makeOutput(
        detailsMarkdown === null ? [] : [makeDiscovery({ alertIds, detailsMarkdown })]
      ),
      expected: undefined,
      metadata: { gold: g },
    } as never);

  it('scores 0 for unconditional containment citing an unconfirmed alert', async () => {
    const result = await run(['o1'], '- Revoke the access key immediately.');
    expect(result).toMatchObject({ score: 0, label: 'unconditional_containment' });
  });

  it('scores 1 when containment is conditional', async () => {
    const result = await run(['o1'], '- If confirmed unauthorized, revoke the access key.');
    expect(result).toMatchObject({ score: 1, label: 'conditional_or_none' });
  });

  it('scores 1 when there is no containment advice', async () => {
    expect(await run(['o1'], '- A console login occurred.')).toMatchObject({ score: 1 });
  });

  it('is N/A when every discovery cites only confirmed-malicious alerts', async () => {
    expect(await run(['c1', 'c2'], '- Revoke the key.')).toMatchObject({
      score: null,
      label: 'N/A',
    });
  });

  it('scores a discovery that mixes confirmed and unconfirmed alerts', async () => {
    expect(await run(['c1', 'o1'], '- Revoke the key.')).toMatchObject({ score: 0 });
  });

  it('scores a discovery that cites nothing, since it cannot be shown to be confirmed', async () => {
    expect(await run([], '- Revoke the key.')).toMatchObject({ score: 0 });
  });

  it('scores every discovery when the scenario confirms no group', async () => {
    expect(
      await run(['c1'], '- Revoke the key.', makeGold({ alertGroups: { chain: ['c1'] } }))
    ).toMatchObject({ score: 0 });
  });

  it('is N/A when there are no discoveries', async () => {
    expect(await run([], null)).toMatchObject({ score: null, label: 'N/A' });
  });
});
