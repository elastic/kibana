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

  it('accepts the aggregation filter inside STATS, which is not a WHERE command', () => {
    // `STATS ... WHERE` parses as a function rather than a command, so a filter-aware gate
    // has to reach it or it rejects a legitimately filtered aggregating query.
    const query =
      'FROM logs-aws.* | STATS count = COUNT(*) WHERE source.ip == "192.0.2.30" BY host.name';
    expect(assertEsqlGroundedInReport(query, { reportText: 'unrelated', iocValues }).ok).toBe(true);
  });

  it('does not let a literal in the aggregation itself ground the query', () => {
    const query =
      'FROM logs-aws.* | STATS count = COUNT(*) WHERE event.outcome == "success" BY host.name';
    expect(assertEsqlGroundedInReport(query, { reportText, iocValues: [] }).ok).toBe(false);
  });

  it('accepts a filter inside a FORK branch', () => {
    const query =
      'FROM logs-aws.* | FORK (WHERE source.ip == "192.0.2.30") (WHERE user.name == "x")';
    expect(assertEsqlGroundedInReport(query, { reportText: 'unrelated', iocValues }).ok).toBe(true);
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

  it('does not count the FROM source as a report filter', () => {
    // Even if the report names the index, reading it is not filtering on report data.
    const query = 'FROM logs-aws.* | LIMIT 1';
    expect(
      assertEsqlGroundedInReport(query, { reportText: 'we searched logs-aws.*', iocValues: [] }).ok
    ).toBe(false);
  });
});
