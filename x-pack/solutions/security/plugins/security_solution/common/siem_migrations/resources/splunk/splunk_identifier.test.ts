/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splResourceIdentifier } from './splunk_identifier';

describe('splResourceIdentifier', () => {
  it('should extract macros correctly', () => {
    const query =
      '`macro_zero`, `macro_one(arg1)`, some search command `macro_two(arg1, arg2)` another command `macro_three(arg1, arg2, arg3)`';

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'macro', name: 'macro_zero' },
      { type: 'macro', name: 'macro_one(1)' },
      { type: 'macro', name: 'macro_two(2)' },
      { type: 'macro', name: 'macro_three(3)' },
    ]);
  });

  it('should extract macros with double quotes parameters correctly', () => {
    const query = '| `macro_one("90","2")` | `macro_two("20")`';

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'macro', name: 'macro_one(2)' },
      { type: 'macro', name: 'macro_two(1)' },
    ]);
  });

  it('should extract macros with single quotes parameters correctly', () => {
    const query = "| `macro_one('90','2')` | `macro_two('20')`";

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'macro', name: 'macro_one(2)' },
      { type: 'macro', name: 'macro_two(1)' },
    ]);
  });

  it('should extract lookup tables correctly', () => {
    const query =
      'search ... | lookup my_lookup_table field AS alias OUTPUT new_field | lookup other_lookup_list | lookup third_lookup';

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'lookup', name: 'my_lookup_table' },
      { type: 'lookup', name: 'other_lookup_list' },
      { type: 'lookup', name: 'third' },
    ]);
  });

  it('should extract both macros and lookup tables correctly', () => {
    const query =
      '`macro_one` some search command | lookup my_lookup_table field AS alias OUTPUT new_field | lookup other_lookup_list | lookup third_lookup';

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'macro', name: 'macro_one' },
      { type: 'lookup', name: 'my_lookup_table' },
      { type: 'lookup', name: 'other_lookup_list' },
      { type: 'lookup', name: 'third' },
    ]);
  });

  it('should extract lookup correctly when there are modifiers', () => {
    const query =
      'lookup my_lookup_1 field AS alias OUTPUT new_field | lookup local=true my_lookup_2 | lookup update=true my_lookup_3 | lookup local=true update=true my_lookup_4 | lookup update=false local=true  my_lookup_5';

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'lookup', name: 'my_lookup_1' },
      { type: 'lookup', name: 'my_lookup_2' },
      { type: 'lookup', name: 'my_lookup_3' },
      { type: 'lookup', name: 'my_lookup_4' },
      { type: 'lookup', name: 'my_lookup_5' },
    ]);
  });

  it('should return empty arrays if no macros or lookup tables are found', () => {
    const query = 'search | stats count';

    const result = splResourceIdentifier(query);
    expect(result).toEqual([]);
  });

  it('should handle queries with both macros and lookup tables mixed with other commands', () => {
    const query =
      'search `macro_one` | `my_lookup_table` field AS alias myfakelookup new_field | lookup real_lookup_list | `third_macro`';

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'macro', name: 'macro_one' },
      { type: 'macro', name: 'my_lookup_table' },
      { type: 'macro', name: 'third_macro' },
      { type: 'lookup', name: 'real_lookup_list' },
    ]);
  });

  it('should ignore macros or lookup tables inside string literals with double quotes', () => {
    const query =
      '`macro_one` | lookup my_lookup_table | search title="`macro_two` and lookup another_table"';

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'macro', name: 'macro_one' },
      { type: 'lookup', name: 'my_lookup_table' },
    ]);
  });

  it('should ignore macros or lookup tables inside string literals with single quotes', () => {
    const query =
      "`macro_one` | lookup my_lookup_table | search title='`macro_two` and lookup another_table'";

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'macro', name: 'macro_one' },
      { type: 'lookup', name: 'my_lookup_table' },
    ]);
  });

  it('should ignore macros or lookup tables inside comments wrapped by ```', () => {
    const query =
      '`macro_one` ```this is a comment with `macro_two` and lookup another_table``` | lookup my_lookup_table ```this is another comment```';

    const result = splResourceIdentifier(query);
    expect(result).toEqual([
      { type: 'macro', name: 'macro_one' },
      { type: 'lookup', name: 'my_lookup_table' },
    ]);
  });
});
