/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntBehaviorIoc } from '@kbn/alertzero-common';
import type { ValidatedBehavior } from './types';
import {
  artifactSetKey,
  collapseByArtifactSet,
  queryHuntsArtifacts,
} from './behavior_artifact_set';

const ioc = (value: string, type = 'domain'): HuntBehaviorIoc => ({ type, value });

const behavior = (overrides: Partial<ValidatedBehavior> = {}): ValidatedBehavior => ({
  technique_id: 'T1078.004',
  evidence_quote: 'evidence',
  llm_confidence: 0.9,
  confidence: 0.9,
  technique_name: 'Cloud Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/004/',
  tactic_ids: ['TA0001'],
  validated_esql: 'FROM logs-aws.* | LIMIT 1',
  title: 'Hunt: Cloud Accounts (T1078.004)',
  severity: 'high',
  risk_score: 73,
  ...overrides,
});

describe('artifactSetKey', () => {
  it('matches a report IOC value regardless of case and whitespace', () => {
    expect(
      artifactSetKey('traffic to EVIL.example.com was observed', [ioc('evil.example.com')])
    ).toBe('evil.example.com');
  });

  it('matches an IOC whose own value has different internal whitespace than the quote', () => {
    expect(artifactSetKey('seen on host   WIN-SERVER01 today', [ioc('win-server01', 'host')])).toBe(
      'win-server01'
    );
  });

  it('ignores an IOC value shorter than 4 characters', () => {
    expect(artifactSetKey('the ip 10 was logged', [ioc('10', 'ip')])).toBeNull();
  });

  it('returns null when no IOC appears in the quote', () => {
    expect(artifactSetKey('generic phishing activity', [ioc('evil.example.com')])).toBeNull();
  });

  it('returns null when there are no IOCs at all', () => {
    expect(artifactSetKey('generic phishing activity', undefined)).toBeNull();
  });

  it('returns the same key regardless of the order IOCs are passed in', () => {
    const quote = 'traffic from evil.example.com to 203.0.113.5 was observed';
    const forward = artifactSetKey(quote, [ioc('evil.example.com'), ioc('203.0.113.5', 'ip')]);
    const reverse = artifactSetKey(quote, [ioc('203.0.113.5', 'ip'), ioc('evil.example.com')]);
    expect(forward).toBe(reverse);
    expect(forward).not.toBeNull();
  });

  it('does not match a value that is only part of a longer indicator in the quote', () => {
    // `example.com` inside `evil.example.com` is a different indicator; collapsing a behavior
    // about the longer one onto a hunt for the shorter would retire it on a hunt that never ran.
    expect(artifactSetKey('traffic to evil.example.com was observed', [ioc('example.com')])).toBe(
      null
    );
  });

  it('does not match an IP that is a prefix of a longer IP in the quote', () => {
    expect(artifactSetKey('scanned 10.0.0.10 for open ports', [ioc('10.0.0.1')])).toBe(null);
    expect(artifactSetKey('beaconed to 10.0.0.1 nightly', [ioc('10.0.0.1')])).toBe('10.0.0.1');
  });

  it('matches an indicator that ends a sentence', () => {
    expect(artifactSetKey('the beacon resolved evil.example.com.', [ioc('evil.example.com')])).toBe(
      'evil.example.com'
    );
    expect(artifactSetKey('(see evil.example.com), then', [ioc('evil.example.com')])).toBe(
      'evil.example.com'
    );
  });

  it('does not count the IOC type toward the key, so two differently typed IOCs with the same value collapse to one entry', () => {
    const quote = 'traffic to evil.example.com was observed';
    expect(artifactSetKey(quote, [ioc('evil.example.com', 'domain')])).toBe(
      artifactSetKey(quote, [ioc('evil.example.com', 'url')])
    );
  });
});

describe('collapseByArtifactSet', () => {
  it('collapses two behaviors whose quotes name the same artifact, keeping the higher-confidence survivor', () => {
    const loser = behavior({
      technique_id: 'T1566',
      evidence_quote: 'evil.example.com',
      confidence: 0.6,
    });
    const winner = behavior({
      technique_id: 'T1078.004',
      evidence_quote: 'traffic to evil.example.com',
      confidence: 0.9,
    });

    const { survivors, collapsed } = collapseByArtifactSet(
      [loser, winner],
      [ioc('evil.example.com')]
    );

    expect(survivors).toEqual([winner]);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]).toEqual({
      behavior: loser,
      survivor: winner,
      key: 'evil.example.com',
    });
  });

  it('ties on confidence by keeping the lexicographically lower technique_id', () => {
    const higherId = behavior({
      technique_id: 'T1566',
      evidence_quote: 'evil.example.com',
      confidence: 0.8,
    });
    const lowerId = behavior({
      technique_id: 'T1078.004',
      evidence_quote: 'evil.example.com seen again',
      confidence: 0.8,
    });

    const { survivors } = collapseByArtifactSet([higherId, lowerId], [ioc('evil.example.com')]);

    expect(survivors).toEqual([lowerId]);
  });

  it('preserves input order among survivors', () => {
    const alone = behavior({
      technique_id: 'T1566',
      evidence_quote: 'generic phishing',
      confidence: 0.5,
    });
    const loser = behavior({
      technique_id: 'T1059',
      evidence_quote: 'evil.example.com',
      confidence: 0.4,
    });
    const winner = behavior({
      technique_id: 'T1078.004',
      evidence_quote: 'traffic to evil.example.com',
      confidence: 0.9,
    });

    const { survivors } = collapseByArtifactSet([alone, loser, winner], [ioc('evil.example.com')]);

    expect(survivors).toEqual([alone, winner]);
  });

  it('never merges behaviors with no shared artifact', () => {
    const first = behavior({
      technique_id: 'T1566',
      evidence_quote: 'generic phishing',
      confidence: 0.5,
    });
    const second = behavior({
      technique_id: 'T1059',
      evidence_quote: 'generic scripting',
      confidence: 0.9,
    });

    const { survivors, collapsed } = collapseByArtifactSet([first, second], undefined);

    expect(survivors).toEqual([first, second]);
    expect(collapsed).toEqual([]);
  });
});

describe('queryHuntsArtifacts', () => {
  it('is true when the query filters on every artifact in the key', () => {
    const key = artifactSetKey('seen at evil.example.com and 10.0.0.1', [
      { type: 'domain', value: 'evil.example.com' },
      { type: 'ip', value: '10.0.0.1' },
    ])!;
    const esql =
      'FROM logs-* | WHERE destination.domain == "evil.example.com" AND source.ip == "10.0.0.1"';
    expect(queryHuntsArtifacts(esql, key)).toBe(true);
  });

  it('is false when the query grounds on a different report literal than the key', () => {
    const key = artifactSetKey('seen at evil.example.com', [
      { type: 'domain', value: 'evil.example.com' },
    ])!;
    expect(queryHuntsArtifacts('FROM logs-* | WHERE event.action == "AssumeRole"', key)).toBe(
      false
    );
  });

  it('is false when the query carries only some of the artifacts in the key', () => {
    const key = artifactSetKey('seen at evil.example.com and 10.0.0.1', [
      { type: 'domain', value: 'evil.example.com' },
      { type: 'ip', value: '10.0.0.1' },
    ])!;
    expect(
      queryHuntsArtifacts('FROM logs-* | WHERE destination.domain == "evil.example.com"', key)
    ).toBe(false);
  });

  it('matches regardless of case in the query', () => {
    const key = artifactSetKey('seen at evil.example.com', [
      { type: 'domain', value: 'evil.example.com' },
    ])!;
    expect(
      queryHuntsArtifacts('FROM logs-* | WHERE destination.domain == "EVIL.Example.COM"', key)
    ).toBe(true);
  });

  it('is false when the artifact only appears under a negation', () => {
    const key = artifactSetKey('seen at evil.example.com', [
      { type: 'domain', value: 'evil.example.com' },
    ])!;
    expect(
      queryHuntsArtifacts('FROM logs-* | WHERE destination.domain != "evil.example.com"', key)
    ).toBe(false);
  });

  it('is false when the artifact only appears in an EVAL rather than a filter', () => {
    const key = artifactSetKey('seen at evil.example.com', [
      { type: 'domain', value: 'evil.example.com' },
    ])!;
    expect(
      queryHuntsArtifacts(
        'FROM logs-* | EVAL label = "evil.example.com" | WHERE event.action == "AssumeRole"',
        key
      )
    ).toBe(false);
  });

  it('is false when the artifact is one alternative beside an ungrounded OR branch', () => {
    const key = artifactSetKey('seen at evil.example.com', [
      { type: 'domain', value: 'evil.example.com' },
    ])!;
    expect(
      queryHuntsArtifacts(
        'FROM logs-* | WHERE destination.domain == "evil.example.com" OR process.name == "cmd.exe"',
        key
      )
    ).toBe(false);
  });

  it('is true when the artifact is hunted through an escaped RLIKE pattern', () => {
    const key = artifactSetKey('seen at evil.example.com', [
      { type: 'domain', value: 'evil.example.com' },
    ])!;
    expect(
      queryHuntsArtifacts(
        String.raw`FROM logs-* | WHERE destination.domain RLIKE ".*evil\\.example\\.com.*"`,
        key
      )
    ).toBe(true);
  });

  it('is true when the artifact is an escaped Windows path in the query', () => {
    const key = artifactSetKey('dropped at C:\\Users\\Public\\evil.exe', [
      { type: 'path', value: 'C:\\Users\\Public\\evil.exe' },
    ])!;
    expect(
      queryHuntsArtifacts(
        'FROM logs-* | WHERE file.path == "C:\\\\Users\\\\Public\\\\evil.exe"',
        key
      )
    ).toBe(true);
  });

  it('is true when the query hunts every shared artifact as alternatives of one IN list', () => {
    const key = artifactSetKey('seen at a.example and b.example', [
      { type: 'domain', value: 'a.example' },
      { type: 'domain', value: 'b.example' },
    ])!;
    expect(
      queryHuntsArtifacts(
        'FROM logs-* | WHERE destination.domain IN ("a.example", "b.example")',
        key
      )
    ).toBe(true);
  });

  it('is true when the query hunts every shared artifact as OR alternatives', () => {
    const key = artifactSetKey('seen at a.example and b.example', [
      { type: 'domain', value: 'a.example' },
      { type: 'domain', value: 'b.example' },
    ])!;
    expect(
      queryHuntsArtifacts(
        'FROM logs-* | WHERE destination.domain == "a.example" OR dns.question.name == "b.example"',
        key
      )
    ).toBe(true);
  });

  it('is false when one shared artifact is only mentioned beside a filter on the other', () => {
    const key = artifactSetKey('seen at a.example and b.example', [
      { type: 'domain', value: 'a.example' },
      { type: 'domain', value: 'b.example' },
    ])!;
    expect(
      queryHuntsArtifacts(
        'FROM logs-* | WHERE destination.domain == "a.example" AND dns.question.name != "b.example"',
        key
      )
    ).toBe(false);
  });

  it('is false when the query hunts both artifacts as alternatives but excludes one of them again', () => {
    const key = artifactSetKey('seen at a.example and b.example', [
      { type: 'domain', value: 'a.example' },
      { type: 'domain', value: 'b.example' },
    ])!;
    expect(
      queryHuntsArtifacts(
        'FROM logs-* | WHERE destination.domain IN ("a.example", "b.example") AND destination.domain != "b.example"',
        key
      )
    ).toBe(false);
  });

  it('is false when an artifact is excluded through an escaped NOT RLIKE pattern', () => {
    const key = artifactSetKey('seen at a.example and b.example', [
      { type: 'domain', value: 'a.example' },
      { type: 'domain', value: 'b.example' },
    ])!;
    expect(
      queryHuntsArtifacts(
        String.raw`FROM logs-* | WHERE destination.domain IN ("a.example", "b.example") AND destination.domain NOT RLIKE "b\.example"`,
        key
      )
    ).toBe(false);
  });

  it('is false when an artifact is excluded through a wildcarded NOT LIKE pattern', () => {
    const key = artifactSetKey('seen at a.example and b.example', [
      { type: 'domain', value: 'a.example' },
      { type: 'domain', value: 'b.example' },
    ])!;
    expect(
      queryHuntsArtifacts(
        'FROM logs-* | WHERE destination.domain IN ("a.example", "b.example") AND destination.domain NOT LIKE "*b.example*"',
        key
      )
    ).toBe(false);
  });

  it('is false when an artifact is excluded through NOT IN even though another branch hunts it', () => {
    const key = artifactSetKey('seen at a.example', [{ type: 'domain', value: 'a.example' }])!;
    expect(
      queryHuntsArtifacts(
        'FROM logs-* | WHERE destination.domain == "a.example" AND NOT dns.question.name IN ("a.example")',
        key
      )
    ).toBe(false);
  });
});
