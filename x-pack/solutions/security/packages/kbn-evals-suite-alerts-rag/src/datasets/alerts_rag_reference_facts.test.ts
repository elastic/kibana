/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsRagDataset } from './alerts_rag_dataset';
import { ALERTS_RAG_EXPECTED_FACTS } from './alerts_rag_expected_facts';

/**
 * The facts the reference answers must carry, written out literally so a change
 * to `ALERTS_RAG_EXPECTED_FACTS` (or to a reference answer) fails here instead
 * of silently shipping references the correctness judge cannot match against a
 * correct, data-bearing answer.
 *
 * Regression context: with guidance-only references, every concrete claim in a
 * correct answer is scored `NOT_IN_GROUND_TRUTH` (central = 0.1, combined by
 * geometric mean), which near-zeroes Factuality on the same traces where
 * Groundedness marks those claims FULLY_SUPPORTED. See the F2 finding on
 * `bk-01a14b73-security-alerts-rag-regression`.
 */
const PINNED_FACTS = {
  totalOpenAlerts: 285,
  severityCounts: { critical: 255, high: 30 },
  severityRiskScores: { critical: 99, high: 73 },
  riskScoreRange: { min: 73, max: 99 },
  hostAlertCounts: [
    ['SRVWIN03', 63],
    ['SRVWIN04', 45],
    ['SRVWIN03-PRIV', 33],
    ['SRVWIN02', 30],
    ['SRVMAC08', 24],
    ['SRVWIN01', 24],
    ['SRVWIN07', 15],
    ['SRVNIX05', 12],
    ['SRVWIN06', 12],
    ['SRVMAC08-PRIV', 9],
    ['SRVNIX05-PRIV', 3],
    ['SRVWIN01-PRIV', 3],
    ['SRVWIN02-PRIV', 3],
    ['SRVWIN04-PRIV', 3],
    ['SRVWIN06-PRIV', 3],
    ['SRVWIN07-PRIV', 3],
  ],
  userAlertCounts: [
    ['Administrator', 237],
    ['root', 33],
    ['james', 15],
  ],
  criticalTierRuleNames: 30,
  highTierRules: [
    ['Malware Prevention Alert', 24],
    ['Malicious Behavior Prevention Alert: Suspicious Microsoft OneNote Child Process', 3],
    ['Malicious Behavior Prevention Alert: Suspicious MsiExec Child Process', 3],
  ],
  mostRecentAlert: {
    timestamp: '2026-03-26T22:12:18.641Z',
    ruleName: 'Malware Prevention Alert',
    hostName: 'SRVMAC08-PRIV',
    userName: 'root',
    severity: 'high',
    riskScore: 73,
    processName: 'My Go Application.app',
  },
  // "The most severe open alert" has 255 equally-severe answers, so the
  // reference names several of them instead of one "the" alert.
  criticalAlertExamples: [
    {
      timestamp: '2026-03-26T22:12:18.639Z',
      ruleName: 'Malware Detection Alert',
      hostName: 'SRVMAC08',
      userName: 'james',
      severity: 'critical',
      riskScore: 99,
      processName: 'unix1',
    },
    {
      timestamp: '2026-03-26T22:12:18.438Z',
      ruleName: 'Malware Detection Alert',
      hostName: 'SRVWIN01',
      userName: 'Administrator',
      severity: 'critical',
      riskScore: 99,
      processName: 'rundll32.exe',
    },
    {
      timestamp: '2026-03-26T22:12:18.547Z',
      ruleName: 'Malicious Behavior Detection Alert: RunDLL32 with Unusual Arguments',
      hostName: 'SRVWIN04',
      userName: 'Administrator',
      severity: 'critical',
      riskScore: 99,
      processName: 'rundll32.exe',
    },
    {
      timestamp: '2026-03-26T22:12:18.619Z',
      ruleName: 'Malicious Behavior Detection Alert: Potential Credentials Phishing via OSASCRIPT',
      hostName: 'SRVMAC08',
      userName: 'james',
      severity: 'critical',
      riskScore: 99,
      processName: 'osascript',
    },
  ],
  lowestSeverityAlertExample: {
    timestamp: '2026-03-19T20:53:23.568Z',
    ruleName: 'Malware Prevention Alert',
    hostName: 'SRVWIN02-PRIV',
    userName: 'Administrator',
    severity: 'high',
    riskScore: 73,
    processName: 'explorer.exe',
  },
} as const;

const count = (name: string, value: number): string => `${name} (${value})`;

/**
 * Per-example facts the reference answer must state, keyed by the question.
 * Every entry is asserted as a substring of the reference the correctness judge
 * receives as its `[Ground Truth Response]`.
 */
const REQUIRED_REFERENCE_FACTS: Array<{ input: string; required: string[] }> = [
  {
    input: 'Which alerts should I look at first?',
    required: [
      '285 alerts',
      '255 critical (risk_score 99)',
      '30 high (risk_score 73)',
      count('Malware Detection Alert', 81),
      count('Memory Threat Detection Alert: Shellcode Injection', 30),
      count('SRVWIN03', 63),
      count('Administrator', 237),
    ],
  },
  {
    input: 'Based on my open alerts, what hosts are affected?',
    required: [
      '16 distinct host.name values',
      // Every affected host must be named with its count, otherwise an answer
      // that lists the real hosts is scored as unverifiable.
      ...PINNED_FACTS.hostAlertCounts.map(([name, value]) => count(name, value)),
      `${PINNED_FACTS.totalOpenAlerts} open alerts has a host.name`,
    ],
  },
  {
    input: 'Which "user.name" is mentioned the most in the open alerts?',
    required: [
      count('Administrator', 237),
      count('root', 33),
      count('james', 15),
      'Administrator, with 237 of the 285 open alerts',
    ],
  },
  {
    input: 'What is the most recent alert?',
    required: [
      PINNED_FACTS.mostRecentAlert.timestamp,
      PINNED_FACTS.mostRecentAlert.ruleName,
      PINNED_FACTS.mostRecentAlert.hostName,
      `user.name ${PINNED_FACTS.mostRecentAlert.userName}`,
      `risk_score ${PINNED_FACTS.mostRecentAlert.riskScore}`,
    ],
  },
  {
    input: 'Tell me about the most severe open alert.',
    required: [
      '255 critical',
      'risk_score 99',
      count('Malware Detection Alert', 81),
      count('Memory Threat Detection Alert: Shellcode Injection', 30),
      count('Ransomware Detection Alert', 3),
      count('Memory Threat Detection Alert: Windows.Trojan.Qbot', 3),
      count('SRVWIN04', 45),
      count('SRVWIN03-PRIV', 24),
      ...PINNED_FACTS.criticalAlertExamples.flatMap((example) => [
        example.timestamp,
        example.ruleName,
        example.hostName,
        `user.name ${example.userName}`,
        example.processName,
      ]),
    ],
  },
  {
    input: 'Are any open alerts targeting the same host or user?',
    required: [
      'Yes.',
      count('Administrator', 237),
      count('root', 33),
      count('james', 15),
      count('SRVWIN03', 63),
      count('SRVWIN07-PRIV', 3),
      '16 hosts appear in multiple alerts',
    ],
  },
  {
    input: 'Have any new alerts been triggered in the last hour?',
    required: [
      'no alerts have been triggered in the last hour',
      PINNED_FACTS.mostRecentAlert.timestamp,
    ],
  },
  {
    input: "What's the lowest-severity alert I currently have open?",
    required: [
      'lowest severity tier present in the open-alert set is "high"',
      '30 of the 285 open alerts are high',
      '255 are critical',
      count('Malware Prevention Alert', 24),
      `risk_score ${PINNED_FACTS.severityRiskScores.high}`,
      count('SRVMAC08-PRIV', 9),
    ],
  },
  {
    input: 'How many security alerts do I have in the last 24 hours?',
    required: ['0 security alerts', 'must state a zero count'],
  },
];

const findReference = (input: string): string => {
  const example = alertsRagDataset.find((ex) => ex.input === input);
  if (!example) {
    throw new Error(`no dataset example for "${input}"`);
  }
  return example.expected.reference;
};

describe('ALERTS_RAG_EXPECTED_FACTS', () => {
  // The facts are the single source the reference answers and the snapshot
  // verifier both read; pinning them literally here means rotating the snapshot
  // (and the numbers) can't happen without updating the assertions that guard
  // the references.
  it('pins the open-alert totals and severity split', () => {
    expect(ALERTS_RAG_EXPECTED_FACTS.totalOpenAlerts).toBe(PINNED_FACTS.totalOpenAlerts);
    expect({
      critical: ALERTS_RAG_EXPECTED_FACTS.severities.critical.count,
      high: ALERTS_RAG_EXPECTED_FACTS.severities.high.count,
    }).toEqual(PINNED_FACTS.severityCounts);
    expect({
      critical: ALERTS_RAG_EXPECTED_FACTS.severities.critical.riskScore,
      high: ALERTS_RAG_EXPECTED_FACTS.severities.high.riskScore,
    }).toEqual(PINNED_FACTS.severityRiskScores);
    expect(ALERTS_RAG_EXPECTED_FACTS.riskScoreRange).toEqual(PINNED_FACTS.riskScoreRange);
  });

  it('pins the host and user breakdowns', () => {
    expect(
      ALERTS_RAG_EXPECTED_FACTS.hostAlertCounts.map(({ name, count: value }) => [name, value])
    ).toEqual(PINNED_FACTS.hostAlertCounts);
    expect(
      ALERTS_RAG_EXPECTED_FACTS.userAlertCounts.map(({ name, count: value }) => [name, value])
    ).toEqual(PINNED_FACTS.userAlertCounts);
    // Counts must partition the open-alert set: every alert has both fields.
    expect(
      ALERTS_RAG_EXPECTED_FACTS.hostAlertCounts.reduce((sum, { count: value }) => sum + value, 0)
    ).toBe(PINNED_FACTS.totalOpenAlerts);
    expect(
      ALERTS_RAG_EXPECTED_FACTS.userAlertCounts.reduce((sum, { count: value }) => sum + value, 0)
    ).toBe(PINNED_FACTS.totalOpenAlerts);
  });

  it('pins the per-tier rule breakdown', () => {
    expect(ALERTS_RAG_EXPECTED_FACTS.severities.critical.rules).toHaveLength(
      PINNED_FACTS.criticalTierRuleNames
    );
    expect(
      ALERTS_RAG_EXPECTED_FACTS.severities.critical.rules.reduce(
        (sum, { count: value }) => sum + value,
        0
      )
    ).toBe(PINNED_FACTS.severityCounts.critical);
    expect(
      ALERTS_RAG_EXPECTED_FACTS.severities.high.rules.map(({ name, count: value }) => [name, value])
    ).toEqual(PINNED_FACTS.highTierRules);
  });

  it('pins the alert examples the temporal and severity references point at', () => {
    expect(ALERTS_RAG_EXPECTED_FACTS.mostRecentAlert).toMatchObject(PINNED_FACTS.mostRecentAlert);
    expect(ALERTS_RAG_EXPECTED_FACTS.criticalAlertExamples).toMatchObject([
      ...PINNED_FACTS.criticalAlertExamples,
    ]);
    expect(ALERTS_RAG_EXPECTED_FACTS.lowestSeverityAlertExample).toMatchObject(
      PINNED_FACTS.lowestSeverityAlertExample
    );
  });
});

describe('alertsRagDataset reference answers', () => {
  it('covers every example asserted below', () => {
    expect(alertsRagDataset).toHaveLength(REQUIRED_REFERENCE_FACTS.length);
    for (const { input } of REQUIRED_REFERENCE_FACTS) {
      expect(() => findReference(input)).not.toThrow();
    }
  });

  describe.each(REQUIRED_REFERENCE_FACTS)('$input', ({ input, required }) => {
    it.each(required)('reference states "%s"', (fact) => {
      expect(findReference(input)).toContain(fact);
    });
  });

  it('gives every data-bearing reference facts that only the alert data can supply', () => {
    // Guards against a regression to guidance-only prose ("list the distinct
    // hostnames"): a reference that names no host and no user is one a correct,
    // data-bearing answer cannot be scored against.
    const dataBearingReferences = alertsRagDataset
      .filter((ex) => ex.metadata.category !== 'space_isolation')
      .map((ex) => ({ input: ex.input, reference: ex.expected.reference }));

    expect(dataBearingReferences).toHaveLength(8);

    for (const { input, reference } of dataBearingReferences) {
      const namesAlertEntity =
        PINNED_FACTS.hostAlertCounts.some(([name]) => reference.includes(name)) ||
        PINNED_FACTS.userAlertCounts.some(([name]) => reference.includes(name));
      expect({ input, namesAlertEntity }).toEqual({ input, namesAlertEntity: true });
      expect({ input, numbers: (reference.match(/\b\d+\b/g) ?? []).length >= 3 }).toEqual({
        input,
        numbers: true,
      });
    }
  });

  it('keeps the space-isolation reference data-free (its answer is a zero count)', () => {
    const reference = findReference('How many security alerts do I have in the last 24 hours?');
    expect(reference).toContain('0 security alerts');
    expect(reference).not.toContain(String(PINNED_FACTS.totalOpenAlerts));
    for (const [host] of PINNED_FACTS.hostAlertCounts) {
      expect(reference).not.toContain(host);
    }
  });

  it('keeps the empty-window reference pointing at the absence of recent alerts', () => {
    const reference = findReference('Have any new alerts been triggered in the last hour?');
    expect(reference).toContain('no alerts have been triggered in the last hour');
    expect(reference).not.toContain('enumerate the recent alerts');
  });
});
