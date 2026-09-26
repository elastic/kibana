/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEvidenceQuoteGrounded, assertEsqlGroundedInReport } from './report_grounding';

describe('isEvidenceQuoteGrounded', () => {
  const text = 'The actor called sts.AssumeRole into escalated-role and reached corp-prod-data.';

  it('accepts a verbatim quote', () => {
    expect(isEvidenceQuoteGrounded('called sts.AssumeRole into escalated-role', text)).toBe(true);
  });

  it('ignores case and whitespace differences', () => {
    expect(isEvidenceQuoteGrounded('  CALLED   sts.assumerole\ninto escalated-role ', text)).toBe(
      true
    );
  });

  it('accepts a quote truncated with an internal ellipsis when both sides appear', () => {
    expect(isEvidenceQuoteGrounded('called sts.AssumeRole ... reached corp-prod-data', text)).toBe(
      true
    );
  });

  it('rejects a fabricated quote that is not in the text', () => {
    expect(isEvidenceQuoteGrounded('exfiltrated data to an external server', text)).toBe(false);
  });

  it('rejects a fabrication stitched from unrelated fragments across an ellipsis', () => {
    expect(isEvidenceQuoteGrounded('called sts.AssumeRole ... to an external server', text)).toBe(
      false
    );
  });

  it('rejects a quote that reverses the order the report states', () => {
    // Every segment appears in the text, so a presence-only check accepts this and Tier 2
    // publishes a finding asserting a chronology the report contradicts.
    expect(isEvidenceQuoteGrounded('reached corp-prod-data ... sts.AssumeRole', text)).toBe(false);
  });

  it('rejects a repeated segment that only one occurrence in the text can satisfy', () => {
    expect(isEvidenceQuoteGrounded('escalated-role ... escalated-role', text)).toBe(false);
  });

  it('accepts a repeated segment when the text really does repeat it', () => {
    expect(
      isEvidenceQuoteGrounded(
        'AssumeRole ... AssumeRole',
        'AssumeRole was called, then AssumeRole again.'
      )
    ).toBe(true);
  });

  it('accepts three segments given in the order the report uses', () => {
    expect(isEvidenceQuoteGrounded('called ... escalated-role ... corp-prod-data', text)).toBe(
      true
    );
  });

  it('rejects an empty or whitespace-only quote', () => {
    expect(isEvidenceQuoteGrounded('   ', text)).toBe(false);
  });
});

describe('assertEsqlGroundedInReport', () => {
  const reportText = 'AssumeRole into escalated-role in account 123456789012 from 192.0.2.30.';
  const iocValues = ['192.0.2.30'];

  it('accepts a query filtering on a value quoted in the report', () => {
    const query = 'FROM logs-aws.* | WHERE aws.cloudtrail.event_name == "AssumeRole" | LIMIT 100';
    expect(assertEsqlGroundedInReport(query, { reportText, iocValues }).ok).toBe(true);
  });

  it('accepts a query filtering on an extracted IOC even when the text does not repeat it', () => {
    const query = 'FROM logs-aws.* | WHERE source.ip == "192.0.2.30" | LIMIT 25';
    expect(assertEsqlGroundedInReport(query, { reportText: 'unrelated', iocValues }).ok).toBe(true);
  });

  it('rejects an unfiltered query that just returns an arbitrary row', () => {
    const result = assertEsqlGroundedInReport('FROM logs-aws.* | LIMIT 1', {
      reportText,
      iocValues,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a query whose only filter value is not drawn from the report', () => {
    const query = 'FROM logs-aws.* | WHERE event.outcome == "success" | LIMIT 10';
    expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
  });

  it('does not let a short numeric literal such as a LIMIT ground the query', () => {
    // "30" is a substring of the account id in the text; a short literal must not count.
    const query = 'FROM logs-aws.* | LIMIT 30';
    expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
  });

  it('rejects a query that only mentions a report value outside a filter', () => {
    // The literal is in the query text but restricts nothing: the query still returns the
    // first arbitrary row of a required index, which Tier 2 would count as corroboration.
    const query = 'FROM logs-aws.* | EVAL label = "AssumeRole" | LIMIT 1';
    const result = assertEsqlGroundedInReport(query, { reportText, iocValues: [] });
    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining('no filtering predicate'),
    });
  });

  it.each([
    [
      'an EVAL assignment',
      'FROM logs-aws.* | EVAL label = "AssumeRole" | WHERE event.outcome == "success"',
    ],
    [
      'a GROK pattern',
      'FROM logs-aws.* | GROK message "%{WORD:verb} AssumeRole" | WHERE event.outcome == "success"',
    ],
  ])('does not let a report value in %s ground the query', (_label, query) => {
    // Each query does filter, but on a value that is not from the report, so the mention of
    // `AssumeRole` elsewhere in the pipeline is the only thing that could pass it.
    const result = assertEsqlGroundedInReport(query, { reportText, iocValues: [] });
    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining('no value drawn from the report'),
    });
  });

  it.each([
    [
      'grouped by a field',
      'FROM logs-aws.* | STATS count = COUNT(*) WHERE source.ip == "192.0.2.30" BY host.name',
    ],
    [
      'grouped by the index',
      'FROM logs-aws.* | STATS count = COUNT(*) WHERE source.ip == "192.0.2.30" BY _index',
    ],
  ])('does not let an aggregation filter %s ground the query', (_label, query) => {
    // `STATS ... WHERE` filters the aggregate, not the rows handed back: there is a row per group
    // whether or not anything matched, holding `count = 0`, and Tier 2 would read those groups as
    // corroboration. The extraction contract asks for row-level events and no aggregation, so
    // declining this costs nothing it asks for.
    expect(assertEsqlGroundedInReport(query, { reportText, iocValues }).ok).toBe(false);
  });

  it('does not let a literal in the aggregation itself ground the query', () => {
    const query =
      'FROM logs-aws.* | STATS count = COUNT(*) WHERE event.outcome == "success" BY host.name';
    expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
  });

  it('accepts a grounded WHERE command in front of an aggregation', () => {
    // The shape an aggregating query has to take to ground: the rows are selected before they are
    // counted, so the groups are built from rows the report chose.
    const query =
      'FROM logs-aws.* | WHERE source.ip == "192.0.2.30" | STATS count = COUNT(*) BY host.name';
    expect(assertEsqlGroundedInReport(query, { reportText: 'unrelated', iocValues }).ok).toBe(true);
  });

  describe('a FORK unions the rows of its branches', () => {
    it('rejects a fork with an ungrounded branch even though another branch is grounded', () => {
      // The second branch returns every successful event, and Tier 2 cannot tell which branch a
      // row came from: unrelated rows would set the confirmed-hit bar alongside the grounded ones.
      const query =
        'FROM logs-aws.* | FORK (WHERE source.ip == "192.0.2.30") (WHERE event.outcome == "success")';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues }).ok).toBe(false);
    });

    it('accepts a fork whose every branch is grounded', () => {
      const query =
        'FROM logs-aws.* | FORK (WHERE source.ip == "192.0.2.30" | LIMIT 5) (WHERE event.action == "AssumeRole")';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues }).ok).toBe(true);
    });

    it('accepts a grounded filter applied after the fork, which constrains the union', () => {
      const query =
        'FROM logs-aws.* | FORK (WHERE event.outcome == "success") (WHERE event.outcome == "failure") | WHERE source.ip == "192.0.2.30"';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues }).ok).toBe(true);
    });

    it('rejects a fork whose branches filter on nothing from the report', () => {
      const query =
        'FROM logs-aws.* | FORK (WHERE event.outcome == "success") (WHERE event.outcome == "failure")';
      const result = assertEsqlGroundedInReport(query, { reportText, iocValues: [] });
      expect(result).toEqual({
        ok: false,
        reason: expect.stringContaining('no value drawn from the report'),
      });
    });
  });

  it('accepts a report value passed to a full-text function in the filter', () => {
    const query = 'FROM logs-aws.* | WHERE MATCH(message, "escalated-role") | LIMIT 10';
    expect(
      assertEsqlGroundedInReport(query, {
        reportText: 'the actor reached escalated-role',
        iocValues: [],
      }).ok
    ).toBe(true);
  });

  it('says an unfiltered query has no predicate, not that the report is missing from it', () => {
    const result = assertEsqlGroundedInReport('FROM logs-aws.* | LIMIT 1', {
      reportText,
      iocValues,
    });
    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining('no filtering predicate'),
    });
  });

  it('does not let a filter on _index ground the query', () => {
    // Restating the scope narrows nothing about the report.
    const query = 'FROM logs-aws.* | WHERE _index == "logs-aws.cloudtrail-default"';
    expect(
      assertEsqlGroundedInReport(query, {
        reportText: 'activity in logs-aws.cloudtrail-default',
        iocValues: [],
      }).ok
    ).toBe(false);
  });

  describe('a predicate has to constrain rows to the report value, not away from it', () => {
    it.each([
      ['!=', 'FROM logs-aws.* | WHERE event.action != "AssumeRole"'],
      ['NOT', 'FROM logs-aws.* | WHERE NOT event.action == "AssumeRole"'],
      ['NOT LIKE', 'FROM logs-aws.* | WHERE event.action NOT LIKE "*AssumeRole*"'],
      [
        'NOT IN',
        'FROM logs-aws.* | WHERE event.action NOT IN ("AssumeRole", "AssumeRoleWithSAML")',
      ],
    ])('rejects a report value carried by %s', (_label, query) => {
      // The report's artifact selects everything that is *not* the evidence, and Tier 2 would
      // count any row that comes back as corroboration of it.
      const result = assertEsqlGroundedInReport(query, { reportText, iocValues: [] });
      expect(result).toEqual({
        ok: false,
        reason: expect.stringContaining('no predicate searches the document for it'),
      });
    });

    it('accepts a grounded comparison ANDed with a negation', () => {
      // AND narrows, so one grounded branch is enough.
      const query =
        'FROM logs-aws.* | WHERE event.action == "AssumeRole" AND event.outcome != "failure"';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(true);
    });

    it('rejects a grounded comparison ORed with an ungrounded one', () => {
      // OR widens: the ungrounded branch brings back rows the report says nothing about, and
      // any of them would set has_confirmed_hit.
      const query =
        'FROM logs-aws.* | WHERE event.action == "AssumeRole" OR event.outcome == "success"';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
    });

    it('accepts an OR where every branch is grounded', () => {
      const query =
        'FROM logs-aws.* | WHERE event.action == "AssumeRole" OR source.ip == "192.0.2.30"';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues }).ok).toBe(true);
    });

    it('accepts IN when every value is grounded and rejects it when one is not', () => {
      // `IN` is a set of alternatives, so it widens exactly as OR does.
      const grounded = 'FROM logs-aws.* | WHERE source.ip IN ("192.0.2.30", "AssumeRole")';
      const widened = 'FROM logs-aws.* | WHERE source.ip IN ("192.0.2.30", "203.0.113.7")';
      expect(assertEsqlGroundedInReport(grounded, { reportText, iocValues }).ok).toBe(true);
      expect(assertEsqlGroundedInReport(widened, { reportText, iocValues }).ok).toBe(false);
    });

    it('does not let a report value in a range comparison ground the query', () => {
      // A report value under `>` is a threshold, not a search for the artifact.
      const query = 'FROM logs-aws.* | WHERE aws.cloudtrail.count > 123456789012';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
    });
  });

  describe('a predicate has to compare something read from the document', () => {
    it.each([
      [
        'a constant alias',
        'FROM logs-aws.* | EVAL label = "AssumeRole" | WHERE label == "AssumeRole" | LIMIT 1',
      ],
      [
        'a constant alias defined from another',
        'FROM logs-aws.* | EVAL label = "AssumeRole", copy = label | WHERE copy == "AssumeRole"',
      ],
      [
        'a renamed constant alias',
        'FROM logs-aws.* | EVAL label = "AssumeRole" | RENAME label AS tag | WHERE tag == "AssumeRole"',
      ],
      [
        'a constant alias wrapped in a function',
        'FROM logs-aws.* | EVAL label = "AssumeRole" | WHERE TO_UPPER(label) == "ASSUMEROLE"',
      ],
      ['no column at all', 'FROM logs-aws.* | WHERE "AssumeRole" == "AssumeRole" | LIMIT 1'],
      [
        'two metadata fields',
        'FROM logs-aws.* | WHERE _index == "logs-aws.cloudtrail-default" AND _id == "AssumeRole"',
      ],
    ])('rejects a filter comparing %s to the report value', (_label, query) => {
      // Every row satisfies the predicate whatever its telemetry says, so the query returns an
      // arbitrary row of a required index while reading as a hunt for the report's artifact.
      const result = assertEsqlGroundedInReport(query, { reportText, iocValues: [] });
      expect(result).toEqual({
        ok: false,
        reason: expect.stringContaining('a value the query supplied itself'),
      });
    });

    it.each([
      [
        'an EVAL over a document field',
        'FROM logs-aws.* | EVAL action = TO_LOWER(event.action) | WHERE action == "assumerole"',
      ],
      [
        'a GROK capture',
        'FROM logs-aws.* | GROK message "%{WORD:verb}" | WHERE verb == "AssumeRole"',
      ],
    ])('accepts a filter on %s, which does narrow the rows', (_label, query) => {
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(true);
    });
  });

  describe('a value compared whole has to stand on its own in the report', () => {
    it('rejects a value that only appears inside the opposite word', () => {
      // A report about an `unsuccessful login` contains the characters of `success`, but the rows
      // this returns are the opposite of what it describes.
      const query = 'FROM logs-aws.* | WHERE event.outcome == "success"';
      expect(
        assertEsqlGroundedInReport(query, {
          reportText: 'an unsuccessful login from 192.0.2.30',
          iocValues: [],
        }).ok
      ).toBe(false);
    });

    it('accepts the same value when the report states it as a term', () => {
      const query = 'FROM logs-aws.* | WHERE event.outcome == "success"';
      expect(
        assertEsqlGroundedInReport(query, {
          reportText: 'the attempt ended in success.',
          iocValues: [],
        }).ok
      ).toBe(true);
    });

    it('still lets a pattern ground on a fragment that sits inside a word', () => {
      // A fragment of an artifact is part of a word by construction, so the standalone rule would
      // reject the tight pattern the generation contract asks for.
      const query = 'FROM logs-aws.* | WHERE event.action RLIKE "AssumeRol.*"';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(true);
    });
  });

  describe('a pattern built from a report artifact', () => {
    it.each([
      [
        'LIKE with surrounding wildcards',
        'FROM logs-aws.* | WHERE event.action LIKE "*AssumeRole*"',
      ],
      ['LIKE with a trailing wildcard', 'FROM logs-aws.* | WHERE event.action LIKE "AssumeRole*"'],
      ['RLIKE', 'FROM logs-aws.* | WHERE event.action RLIKE ".*AssumeRole.*"'],
    ])('grounds a query using %s', (_label, query) => {
      // The generation contract asks for a tight pattern derived from a concrete artifact, and
      // the report contains no wildcards, so comparing the whole pattern rejects a valid rule.
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(true);
    });

    it('still rejects a pattern whose fragments are not from the report', () => {
      const query = 'FROM logs-aws.* | WHERE event.action LIKE "*ConsoleLogin*"';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
    });

    it('does not let wildcards alone ground a query', () => {
      // Splitting must not turn a pattern of pure metacharacters into a match.
      const query = 'FROM logs-aws.* | WHERE event.action LIKE "*"';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
    });

    it('rejects an RLIKE alternation where one branch is not from the report', () => {
      // Alternation makes a pattern fragment optional rather than required, so it widens like OR:
      // `.*(AssumeRole|.*).*` would match everything while carrying a report value.
      const query = 'FROM logs-aws.* | WHERE event.action RLIKE ".*AssumeRole.*|.*ConsoleLogin.*"';
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
    });

    it('accepts an RLIKE alternation where every branch is from the report', () => {
      const query =
        'FROM logs-aws.* | WHERE event.action RLIKE ".*AssumeRole.*|.*escalated-role.*"';
      expect(
        assertEsqlGroundedInReport(query, {
          reportText: `${reportText} and escalated-role`,
          iocValues: [],
        }).ok
      ).toBe(true);
    });

    it.each([
      ['an optional group', 'FROM logs-aws.* | WHERE event.action RLIKE ".*(AssumeRole)?.*"'],
      ['a starred group', 'FROM logs-aws.* | WHERE event.action RLIKE ".*(AssumeRole)*.*"'],
      [
        'a zero-bounded repeat',
        'FROM logs-aws.* | WHERE event.action RLIKE ".*(AssumeRole){0,2}.*"',
      ],
      ['a character class', 'FROM logs-aws.* | WHERE event.action RLIKE "[AssumeRole]+"'],
      ['a quantified character', 'FROM logs-aws.* | WHERE event.action RLIKE "AssumeRolez?"'],
      ['an internal wildcard', 'FROM logs-aws.* | WHERE event.action RLIKE ".*Assume.*Role.*"'],
      [
        'a character class shorthand',
        String.raw`FROM logs-aws.* | WHERE event.action RLIKE ".*AssumeRole\\w*"`,
      ],
    ])('rejects an RLIKE pattern whose syntax decides what matches — %s', (_label, query) => {
      // Only one shape grounds: a literal core wrapped in anchors and wildcards. Every pattern here
      // names the artifact while letting the regex admit rows without it — `[AssumeRole]+` matches an
      // action of `a` — and enumerating which constructs do that is the mistake this replaced.
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
    });

    it.each([
      ['anchors', 'FROM logs-aws.* | WHERE event.action RLIKE "^AssumeRole$"'],
      ['a leading wildcard only', 'FROM logs-aws.* | WHERE event.action RLIKE ".*AssumeRole"'],
      ['a plus wildcard', 'FROM logs-aws.* | WHERE event.action RLIKE ".+AssumeRole.+"'],
    ])('grounds an RLIKE pattern that is a literal core wrapped in %s', (_label, query) => {
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(true);
    });

    it('grounds a pattern whose core escapes the punctuation in an IOC', () => {
      // A domain has to have its dots escaped to be a literal in a regex, so treating `\.` as
      // pattern syntax would reject the one shape an IOC of this kind can take. ES|QL needs the
      // backslash escaped in turn, which is why the gate has to read the unescaped value.
      const query = String.raw`FROM logs-aws.* | WHERE dns.question.name RLIKE ".*evil\\.example\\.com.*"`;
      expect(
        assertEsqlGroundedInReport(query, {
          reportText: 'unrelated',
          iocValues: ['evil.example.com'],
        }).ok
      ).toBe(true);
    });

    it.each([
      ['QSTR', 'FROM logs-aws.* | WHERE QSTR("event.action: AssumeRole")'],
      [
        'QSTR with an ungrounded OR branch',
        'FROM logs-aws.* | WHERE QSTR("event.action: AssumeRole OR event.outcome: success")',
      ],
      ['KQL', 'FROM logs-aws.* | WHERE KQL("event.action: AssumeRole")'],
    ])('does not let %s ground the query, even carrying a report value', (_label, query) => {
      // The syntax can widen the result in ways reading the string as text cannot see: the
      // `success` branch returns unrelated events that would be counted as corroboration. The
      // generation contract asks for comparisons on ECS fields and never for these.
      expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
    });

    it('requires every term of a full-text match to be grounded', () => {
      // A match query ORs its terms by default, so an ungrounded term widens the result exactly
      // as an ungrounded OR branch does.
      const grounded = 'FROM logs-aws.* | WHERE MATCH(message, "escalated-role")';
      const widened = 'FROM logs-aws.* | WHERE MATCH(message, "escalated-role unrelated-term")';
      const text = 'the actor reached escalated-role';
      expect(assertEsqlGroundedInReport(grounded, { reportText: text, iocValues: [] }).ok).toBe(
        true
      );
      expect(assertEsqlGroundedInReport(widened, { reportText: text, iocValues: [] }).ok).toBe(
        false
      );
    });

    it('refuses a match whose term is too short for the gate to judge', () => {
      // A short term is not a term Elasticsearch ignores: `MATCH(message, "escalated-role up")`
      // returns documents holding only `up`, so excusing it from the requirement — which an
      // earlier version of this test asserted as intent — counted those rows as the report's.
      const query = 'FROM logs-aws.* | WHERE MATCH(message, "escalated-role up")';
      expect(
        assertEsqlGroundedInReport(query, {
          reportText: 'the actor reached escalated-role',
          iocValues: [],
        }).ok
      ).toBe(false);
    });

    it('refuses a match made only of terms too short to verify', () => {
      // The cost of the rule above, stated: a command built from short tokens keeps the
      // placeholder even where the report contains it verbatim, because nothing here can tell
      // `net use` in the report from `net` or `use` in an unrelated document.
      const query = 'FROM logs-aws.* | WHERE MATCH(process.command_line, "net use")';
      expect(
        assertEsqlGroundedInReport(query, {
          reportText: 'the actor ran net use against the share',
          iocValues: [],
        }).ok
      ).toBe(false);
    });

    it('refuses a match on an empty literal instead of passing it vacuously', () => {
      // No term means no requirement, and a requirement list with nothing in it is met by every
      // row, so this has to fail rather than come out grounded by default.
      const query = 'FROM logs-aws.* | WHERE MATCH(message, "")';
      expect(
        assertEsqlGroundedInReport(query, {
          reportText: 'the actor reached escalated-role',
          iocValues: [],
        }).ok
      ).toBe(false);
    });
  });

  it('does not count the FROM source as a report filter', () => {
    // Even if the report names the index, reading it is not filtering on report data.
    const query = 'FROM logs-aws.* | LIMIT 1';
    expect(
      assertEsqlGroundedInReport(query, { reportText: 'we searched logs-aws.*', iocValues: [] }).ok
    ).toBe(false);
  });
});
