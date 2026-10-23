/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hand-written ungrounded queries in the shapes `assertEsqlGroundedInReport` is known to
 * reject, each paired with a grounded rewrite of the same hunt. Nothing in production logs the
 * query text a real Opus call produced, so these are synthetic rather than harvested — but a
 * local run can seed future fixtures: Tier 2's retry logs each ungrounded attempt at debug
 * level with its full query body, so grepping a local log for `[hunt:esql] ungrounded query`
 * surfaces real examples to add here alongside the shapes below.
 *
 * Every `reportText` and `evidenceQuote` here is invented for this file; none of it is drawn
 * from a real report. `evidenceQuote` is always a verbatim substring of its `reportText`, and
 * every `query`/`rewrittenQuery` targets `logs-aws.cloudtrail-*`, which sits inside the
 * `logs-aws.*` allowlist the paired test suites use.
 */
export interface UngroundedQueryFixture {
  name: string;
  reportText: string;
  evidenceQuote: string;
  iocValues: string[];
  /** A query in a known failure shape; must fail the gate with a reason containing this fixture's `expectedReasonIncludes`. */
  query: string;
  /** Substring of the gate's actual rejection reason for `query`. */
  expectedReasonIncludes: string;
  /** A corrective rewrite of `query` that passes the gate for the same `reportText`/`iocValues`. */
  rewrittenQuery: string;
}

export const UNGROUNDED_QUERY_FIXTURES: ReadonlyArray<UngroundedQueryFixture> = [
  {
    name: 'grounded IOC OR generic process-name branch',
    reportText:
      'Incident report: AssumeRole was used to escalate privileges on the host, which analysts observed directly in CloudTrail.',
    evidenceQuote: 'AssumeRole was used to escalate privileges',
    iocValues: [],
    query:
      'FROM logs-aws.cloudtrail-*\n' +
      '| WHERE event.action == "AssumeRole" OR process.name == "svchost.exe"\n' +
      '| LIMIT 10',
    expectedReasonIncludes: 'one alternative among ungrounded branches',
    rewrittenQuery: 'FROM logs-aws.cloudtrail-*\n| WHERE event.action == "AssumeRole"\n| LIMIT 10',
  },
  {
    name: 'IN (...) mixing a report value with an invented value',
    reportText:
      'Threat report: traffic to evil-example-c2.net was flagged as command-and-control activity.',
    evidenceQuote: 'traffic to evil-example-c2.net was flagged',
    iocValues: ['evil-example-c2.net'],
    query:
      'FROM logs-aws.cloudtrail-*\n' +
      '| WHERE destination.domain IN ("evil-example-c2.net", "benign-cdn-example.net")\n' +
      '| LIMIT 10',
    expectedReasonIncludes:
      'query carries a report value but no predicate searches the document for it',
    rewrittenQuery:
      'FROM logs-aws.cloudtrail-*\n| WHERE destination.domain == "evil-example-c2.net"\n| LIMIT 10',
  },
  {
    name: 'negation-only filter',
    reportText: 'Security report: event.action AssumeRole was logged during the compromise window.',
    evidenceQuote: 'event.action AssumeRole was logged',
    iocValues: [],
    query: 'FROM logs-aws.cloudtrail-*\n| WHERE event.action != "AssumeRole"\n| LIMIT 10',
    expectedReasonIncludes: 'negated',
    rewrittenQuery: 'FROM logs-aws.cloudtrail-*\n| WHERE event.action == "AssumeRole"\n| LIMIT 10',
  },
  {
    name: 'FORK with one ungrounded branch',
    reportText:
      'Hunt report: AssumeRole activity was the primary signal analysts tracked throughout the intrusion.',
    evidenceQuote: 'AssumeRole activity was the primary signal',
    iocValues: [],
    query:
      'FROM logs-aws.cloudtrail-* | FORK (WHERE event.action == "AssumeRole") (WHERE event.outcome == "success")',
    expectedReasonIncludes: 'ungrounded branches',
    rewrittenQuery: 'FROM logs-aws.cloudtrail-*\n| WHERE event.action == "AssumeRole"\n| LIMIT 10',
  },
  {
    name: 'QSTR wrapper around a report value',
    reportText:
      'Audit log review: the event.action value AssumeRole was confirmed by the response team.',
    evidenceQuote: 'the event.action value AssumeRole was confirmed',
    iocValues: [],
    query: 'FROM logs-aws.cloudtrail-*\n| WHERE QSTR("event.action: AssumeRole")\n| LIMIT 10',
    expectedReasonIncludes: 'no value drawn from the report',
    rewrittenQuery: 'FROM logs-aws.cloudtrail-*\n| WHERE event.action == "AssumeRole"\n| LIMIT 10',
  },
  {
    name: 'literal present only in EVAL, not WHERE',
    reportText:
      'Investigation notes: AssumeRole was the technique observed; the hunt only needs successful sign-ins for corroboration.',
    evidenceQuote: 'AssumeRole was the technique observed',
    iocValues: [],
    query:
      'FROM logs-aws.cloudtrail-*\n' +
      '| EVAL note = "AssumeRole"\n' +
      '| WHERE event.outcome == "failure"\n' +
      '| LIMIT 10',
    expectedReasonIncludes: 'no value drawn from the report',
    rewrittenQuery: 'FROM logs-aws.cloudtrail-*\n| WHERE event.action == "AssumeRole"\n| LIMIT 10',
  },
  {
    name: 'comparison against a column the query assigned a constant',
    reportText: 'Case summary: AssumeRole was the only technique confirmed across the environment.',
    evidenceQuote: 'AssumeRole was the only technique confirmed',
    iocValues: [],
    query:
      'FROM logs-aws.cloudtrail-*\n' +
      '| EVAL technique = "AssumeRole"\n' +
      '| WHERE technique == "AssumeRole"\n' +
      '| LIMIT 10',
    expectedReasonIncludes: 'compared against a value the query supplied itself',
    rewrittenQuery: 'FROM logs-aws.cloudtrail-*\n| WHERE event.action == "AssumeRole"\n| LIMIT 10',
  },
];
