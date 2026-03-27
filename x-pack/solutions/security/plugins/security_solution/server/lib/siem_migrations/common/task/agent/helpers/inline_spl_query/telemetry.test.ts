/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSPLQueryKeywords, maskSplQueryStrings } from './telemetry';

describe('maskSplQueryStrings', () => {
  it('should mask double-quoted strings', () => {
    expect(maskSplQueryStrings('search action="success"')).toBe('search action="?"');
  });

  it('should mask single-quoted strings', () => {
    expect(maskSplQueryStrings("eval x='hello'")).toBe("eval x='?'");
  });

  it('should mask both quote types in a single query', () => {
    expect(maskSplQueryStrings(`search name="test" | eval x='val'`)).toBe(
      `search name="?" | eval x='?'`
    );
  });
});

describe('getSPLQueryKeywords', () => {
  it('should detect multiple pipe commands in a single query', () => {
    const query =
      'index=firewall | join type=outer src_ip [search index=assets] | fillnull value=unknown | transaction src_ip maxspan=5m | streamstats count by src_ip';
    const result = getSPLQueryKeywords(query);
    expect(result).toEqual(
      expect.arrayContaining(['join', 'fillnull', 'transaction', 'streamstats'])
    );
  });

  it('should detect eval/stats functions used within commands', () => {
    const query =
      'index=main | eval valid=if(isint(status), status, 0) | eval uris=mvfilter(match(uri, "/api/.*")) | stats sumsq(bytes) as total by host | filldown host | xyseries host, count, total';
    const result = getSPLQueryKeywords(query);
    expect(result).toEqual(
      expect.arrayContaining(['isint', 'mvfilter', 'sumsq', 'filldown', 'xyseries'])
    );
  });

  it('should detect keywords used as arguments or field references', () => {
    const query =
      '| rest /services/saved/searches | tags outputfield=tag | iplocation src_ip | eval delta=abs(latency) | stats mode(status) by src | transpose 5 | predict status as predicted';
    const result = getSPLQueryKeywords(query);
    expect(result).toEqual(
      expect.arrayContaining([
        'rest',
        'tags',
        'iplocation',
        'delta',
        'mode',
        'transpose',
        'predict',
      ])
    );
  });

  it('should not detect keywords inside double-quoted strings', () => {
    const query = 'search action="join" | eval x="fillnull and transaction"';
    const result = getSPLQueryKeywords(query);
    expect(result).toEqual(expect.arrayContaining([]));
  });

  it('should not detect keywords inside single-quoted strings', () => {
    const query = "eval note='top secret random script to collect data'";
    const result = getSPLQueryKeywords(query);
    expect(result).toEqual(expect.arrayContaining([]));
  });

  it('should not match keywords as substrings of other words', () => {
    const query = '| eval fieldformat=tostring(val) | dedup dataset | rename restore as backup';
    const result = getSPLQueryKeywords(query);
    expect(result).toEqual(expect.arrayContaining([]));
  });

  it('should be case-insensitive', () => {
    const query = '| JOIN type=outer id [search index=x] | FILLNULL value=0 | STREAMSTATS count';
    const result = getSPLQueryKeywords(query);
    expect(result).toEqual(expect.arrayContaining(['join', 'fillnull', 'streamstats']));
  });

  it('should return empty array for query with no keywords', () => {
    const query = 'index=main sourcetype=syslog | eval x=1+2 | stats count by host | table host';
    const result = getSPLQueryKeywords(query);
    expect(result).toEqual([]);
  });
});
