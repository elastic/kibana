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

  it('does not count the FROM source as a report filter', () => {
    // Even if the report names the index, reading it is not filtering on report data.
    const query = 'FROM logs-aws.* | LIMIT 1';
    expect(
      assertEsqlGroundedInReport(query, { reportText: 'we searched logs-aws.*', iocValues: [] }).ok
    ).toBe(false);
  });
});
