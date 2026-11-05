/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file except in compliance with the Elastic
 * License 2.0.
 */

import { partialResponseContainsJson } from '.';

describe('partialResponseContainsJson', () => {
  it('returns true for a partial JSON object', () => {
    expect(partialResponseContainsJson('{"insights": [{"title": "Chain')).toBe(true);
  });

  it('returns true for a continuation fragment that starts mid-document', () => {
    // a truncated document continued from an arbitrary byte offset:
    expect(partialResponseContainsJson('tle": "PowerShell Stager",\n      "alertIds": [')).toBe(
      true
    );
  });

  it('returns true for plain text inside a JSON string value', () => {
    // a long detailsMarkdown value continued mid-string, before its closing quote:
    expect(
      partialResponseContainsJson(
        ' and beacons to the C2 server over an encrypted channel before exfiltrating data'
      )
    ).toBe(true);
  });

  it('returns false for reasoning prose that opens with a markdown heading', () => {
    expect(
      partialResponseContainsJson(
        '## Reasoning\n\n**Shared entities: confirmed.** All 4 alerts share {{ host.name wks-alice-01 }}.'
      )
    ).toBe(false);
  });

  it('returns false for reasoning prose that opens with a bold label', () => {
    expect(partialResponseContainsJson('**Step 1: Schema compliance.** No stray fields.')).toBe(
      false
    );
  });

  it('returns false for an empty partial', () => {
    expect(partialResponseContainsJson('')).toBe(false);
  });
});
