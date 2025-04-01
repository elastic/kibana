/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { listOperator as operator } from '@kbn/securitysolution-io-ts-list-types';

export const translatedEntryMatchAnyMatcher = t.keyof({
  exact_cased_any: null,
  exact_caseless_any: null,
});

export const translatedEntryMatchAny = t.exact(
  t.type({
    field: t.string,
    operator,
    type: translatedEntryMatchAnyMatcher,
    value: t.array(t.string),
  })
);

export const translatedEntryMatchMatcher = t.keyof({
  exact_cased: null,
  exact_caseless: null,
});

export const translatedEntryMatchWildcardMatcher = t.keyof({
  wildcard_cased: null,
  wildcard_caseless: null,
});
export type TranslatedEntryMatchWildcardMatcher = t.TypeOf<
  typeof translatedEntryMatchWildcardMatcher
>;

export const translatedEntryMatchWildcard = t.exact(
  t.type({
    field: t.string,
    operator,
    type: translatedEntryMatchWildcardMatcher,
    value: t.string,
  })
);
export type TranslatedEntryMatchWildcard = t.TypeOf<typeof translatedEntryMatchWildcard>;

export const translatedEntryMatchWildcardNameMatcher = t.keyof({
  exact_cased: null,
  exact_caseless: null,
});

export const translatedEntryMatchWildcardName = t.exact(
  t.type({
    field: t.string,
    operator,
    type: translatedEntryMatchWildcardNameMatcher,
    value: t.string,
  })
);
export const translatedEntryMatch = t.exact(
  t.type({
    field: t.string,
    operator,
    type: translatedEntryMatchMatcher,
    value: t.string,
  })
);

export const translatedEntryMatcher = t.union([
  translatedEntryMatchMatcher,
  translatedEntryMatchAnyMatcher,
]);
export type TranslatedEntryMatcher = t.TypeOf<typeof translatedEntryMatcher>;

export const translatedEntryNestedEntry = t.union([translatedEntryMatch, translatedEntryMatchAny]);
export type TranslatedEntryNestedEntry = t.TypeOf<typeof translatedEntryNestedEntry>;

export const translatedEntryNested = t.exact(
  t.type({
    field: t.string,
    type: t.keyof({ nested: null }),
    entries: t.array(translatedEntryNestedEntry),
  })
);

const translatedEntriesOfDescendantOf = t.type({
  type: t.string,
  entries: t.array(
    t.union([
      translatedEntryNested,
      translatedEntryMatch,
      translatedEntryMatchWildcard,
      translatedEntryMatchAny,
    ])
  ),
});
export type TranslatedEntriesOfDescendantOf = t.TypeOf<typeof translatedEntriesOfDescendantOf>;

export const translatedEntryDescendantOf = t.exact(
  t.type({
    operator,
    type: t.keyof({ descendent_of: null }),
    value: t.type({
      entries: t.array(translatedEntriesOfDescendantOf),
    }),
  })
);
export type TranslatedEntryDescendantOf = t.TypeOf<typeof translatedEntryDescendantOf>;

export const translatedEntry = t.union([
  translatedEntryNested,
  translatedEntryMatch,
  translatedEntryMatchWildcard,
  translatedEntryMatchAny,
  translatedEntryDescendantOf,
]);
export type TranslatedEntry = t.TypeOf<typeof translatedEntry>;

export const translatedPerformantEntries = t.array(
  t.union([translatedEntryMatchWildcard, translatedEntryMatchWildcardName])
);

export type TranslatedPerformantEntries = t.TypeOf<typeof translatedPerformantEntries>;

export const translatedExceptionListItem = t.exact(
  t.type({
    type: t.string,
    entries: t.array(translatedEntry),
  })
);
export type TranslatedExceptionListItem = t.TypeOf<typeof translatedExceptionListItem>;

export const wrappedTranslatedExceptionList = t.exact(
  t.type({
    entries: t.array(translatedExceptionListItem),
  })
);
export type WrappedTranslatedExceptionList = t.TypeOf<typeof wrappedTranslatedExceptionList>;
