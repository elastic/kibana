/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sentinelResourceIdentifier } from './sentinel_identifier';

describe('sentinelResourceIdentifier', () => {
  it('extracts a single watchlist reference with double quotes', () => {
    const query = 'SecurityEvent | where AccountName in (_GetWatchlist("HighValueAccounts"))';

    expect(sentinelResourceIdentifier(query)).toEqual([
      { type: 'lookup', name: 'HighValueAccounts' },
    ]);
  });

  it('extracts a single watchlist reference with single quotes', () => {
    const query = "SecurityEvent | where AccountName in (_GetWatchlist('HighValueAccounts'))";

    expect(sentinelResourceIdentifier(query)).toEqual([
      { type: 'lookup', name: 'HighValueAccounts' },
    ]);
  });

  it('extracts multiple distinct watchlist references', () => {
    const query =
      "let accounts = _GetWatchlist('Accounts'); let ips = _GetWatchlist('BadIPs'); SecurityEvent";

    expect(sentinelResourceIdentifier(query)).toEqual([
      { type: 'lookup', name: 'Accounts' },
      { type: 'lookup', name: 'BadIPs' },
    ]);
  });

  it('deduplicates repeated watchlist references', () => {
    const query =
      "_GetWatchlist('Accounts') | union _GetWatchlist('Accounts') | join _GetWatchlist('Accounts')";

    expect(sentinelResourceIdentifier(query)).toEqual([{ type: 'lookup', name: 'Accounts' }]);
  });

  it('tolerates whitespace around the function arguments', () => {
    const query = "let v = _GetWatchlist  (   'Spaced'   );";

    expect(sentinelResourceIdentifier(query)).toEqual([{ type: 'lookup', name: 'Spaced' }]);
  });

  it('returns an empty array when no watchlists are referenced', () => {
    const query = 'SecurityEvent | where EventID == 4625 | summarize count() by AccountName';

    expect(sentinelResourceIdentifier(query)).toEqual([]);
  });

  it('returns an empty array for an empty query string', () => {
    expect(sentinelResourceIdentifier('')).toEqual([]);
  });

  it('does not retain regex state across invocations', () => {
    const query = "_GetWatchlist('Accounts')";

    const first = sentinelResourceIdentifier(query);
    const second = sentinelResourceIdentifier(query);

    expect(first).toEqual([{ type: 'lookup', name: 'Accounts' }]);
    expect(second).toEqual(first);
  });
});
