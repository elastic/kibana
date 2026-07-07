/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type {
  Entry,
  EntryNested,
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EntryFieldType } from '@kbn/securitysolution-utils';

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import {
  PROCESS_DESCENDANT_EXTRA_ENTRY,
  TRUSTED_PROCESS_DESCENDANTS_TAG,
} from '../../../../common/endpoint/service/artifacts/constants';
import type { ExperimentalFeatures } from '../../../../common';
import { isProcessDescendantsEnabled } from '../../../../common/endpoint/service/artifacts/utils';
import type {
  InternalArtifactCompleteSchema,
  TranslatedEntry,
  TranslatedPerformantEntries,
  TranslatedEntryMatcher,
  TranslatedEntryMatchWildcard,
  TranslatedEntryMatchWildcardMatcher,
  TranslatedEntryNestedEntry,
  TranslatedExceptionListItem,
  WrappedTranslatedExceptionList,
  TranslatedEntriesOfProcessDescendants,
  TranslatedEntryTrustDescendants,
} from '../../schemas';
import {
  translatedPerformantEntries as translatedPerformantEntriesType,
  translatedEntry as translatedEntryType,
  translatedEntryMatchAnyMatcher,
  translatedEntryMatchMatcher,
  translatedEntryMatchWildcardMatcher,
  translatedEntryNestedEntry,
  wrappedTranslatedExceptionList,
} from '../../schemas';

export async function buildArtifact(
  exceptions: WrappedTranslatedExceptionList,
  schemaVersion: string,
  os: string,
  name: string
): Promise<InternalArtifactCompleteSchema> {
  const exceptionsBuffer = Buffer.from(JSON.stringify(exceptions));
  const sha256 = createHash('sha256').update(exceptionsBuffer.toString()).digest('hex');

  // Keep compression info empty in case its a duplicate. Lazily compress before committing if needed.
  return {
    identifier: `${name}-${os}-${schemaVersion}`,
    compressionAlgorithm: 'none',
    encryptionAlgorithm: 'none',
    decodedSha256: sha256,
    encodedSha256: sha256,
    decodedSize: exceptionsBuffer.byteLength,
    encodedSize: exceptionsBuffer.byteLength,
    body: exceptionsBuffer.toString('base64'),
  };
}

export type ArtifactListId =
  | typeof ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
  | typeof ENDPOINT_ARTIFACT_LISTS.trustedApps.id
  | typeof ENDPOINT_ARTIFACT_LISTS.trustedDevices.id
  | typeof ENDPOINT_ARTIFACT_LISTS.eventFilters.id
  | typeof ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id
  | typeof ENDPOINT_ARTIFACT_LISTS.blocklists.id;

export function convertExceptionsToEndpointFormat(
  exceptions: ExceptionListItemSchema[],
  schemaVersion: string,
  experimentalFeatures: ExperimentalFeatures
) {
  const translatedExceptions = {
    entries: translateToEndpointExceptions(exceptions, schemaVersion, experimentalFeatures),
  };
  const [validated, errors] = validate(translatedExceptions, wrappedTranslatedExceptionList);
  if (errors != null) {
    throw new Error(errors);
  }

  return validated as WrappedTranslatedExceptionList;
}

export async function getFilteredEndpointExceptionListRaw({
  elClient,
  filter,
  listId,
}: {
  elClient: ExceptionListClient;
  filter: string;
  listId: ArtifactListId;
}): Promise<ExceptionListItemSchema[]> {
  const perPage = 1000;
  let exceptions: ExceptionListItemSchema[] = [];
  let page = 1;
  let paging = true;

  while (paging) {
    const response = await elClient.findExceptionListItem({
      listId,
      namespaceType: 'agnostic',
      filter,
      perPage,
      page,
      sortField: 'created_at',
      sortOrder: 'desc',
    });

    if (response?.data !== undefined) {
      exceptions = exceptions.concat(response.data);

      paging = (page - 1) * perPage + response.data.length < response.total;
      page++;
    } else {
      break;
    }
  }

  return exceptions;
}

export async function getAllItemsFromEndpointExceptionList({
  elClient,
  listId,
  os,
}: {
  elClient: ExceptionListClient;
  listId: ArtifactListId;
  os: string;
}): Promise<FoundExceptionListItemSchema['data']> {
  const osFilter = `exception-list-agnostic.attributes.os_types:\"${os}\"`;

  return getFilteredEndpointExceptionListRaw({
    elClient,
    filter: osFilter,
    listId,
  });
}

/**
 * Translates Exception list items to Exceptions the endpoint can understand
 * @param exceptions
 * @param schemaVersion
 * @param experimentalFeatures
 */
export function translateToEndpointExceptions(
  exceptions: ExceptionListItemSchema[],
  schemaVersion: string,
  experimentalFeatures: ExperimentalFeatures
): TranslatedExceptionListItem[] {
  const entrySet = new Set();
  const uniqueItems: TranslatedExceptionListItem[] = [];
  const storeUniqueItem = (item: TranslatedExceptionListItem) => {
    const entryHash = createHash('sha256').update(JSON.stringify(item)).digest('hex');

    if (!entrySet.has(entryHash)) {
      uniqueItems.push(item);
      entrySet.add(entryHash);
    }
  };

  if (schemaVersion === 'v1') {
    exceptions.forEach((entry) => {
      // For Blocklist, we create a single entry for each blocklist entry item
      // if there is an entry with more than one hash type.
      if (
        entry.list_id === ENDPOINT_ARTIFACT_LISTS.blocklists.id &&
        entry.entries.length > 1 &&
        !!entry.entries[0].field.match(EntryFieldType.HASH)
      ) {
        entry.entries.forEach((blocklistSingleEntry) => {
          const translatedItem = translateItem(schemaVersion, {
            ...entry,
            entries: [blocklistSingleEntry],
          });

          storeUniqueItem(translatedItem);
        });
      } else if (
        entry.list_id === ENDPOINT_ARTIFACT_LISTS.eventFilters.id &&
        isProcessDescendantsEnabled(entry)
      ) {
        const translatedItem = translateProcessDescendantEventFilter(schemaVersion, entry);
        storeUniqueItem(translatedItem);
      } else if (
        experimentalFeatures.filterProcessDescendantsForTrustedAppsEnabled &&
        entry.list_id === ENDPOINT_ARTIFACT_LISTS.trustedApps.id &&
        isProcessDescendantsEnabled(entry, TRUSTED_PROCESS_DESCENDANTS_TAG)
      ) {
        const translatedItem = translateProcessDescendantTrustedApp(schemaVersion, entry);
        storeUniqueItem(translatedItem);
      } else {
        const translatedItem = translateItem(schemaVersion, entry);
        storeUniqueItem(translatedItem);
      }
    });

    return uniqueItems;
  } else {
    throw new Error('unsupported schemaVersion');
  }
}

function translateProcessDescendantEventFilter(
  schemaVersion: string,
  entry: ExceptionListItemSchema
): TranslatedExceptionListItem {
  const translatedEntries: TranslatedEntriesOfProcessDescendants = translateItem(schemaVersion, {
    ...entry,
    entries: [...entry.entries, PROCESS_DESCENDANT_EXTRA_ENTRY],
  }) as TranslatedEntriesOfProcessDescendants;

  return {
    type: entry.type,
    entries: [
      {
        operator: 'included',
        type: 'descendent_of',
        value: {
          entries: [translatedEntries],
        },
      },
    ],
  };
}

function translateProcessDescendantTrustedApp(
  schemaVersion: string,
  entry: ExceptionListItemSchema
): TranslatedEntryTrustDescendants {
  const translatedEntries: TranslatedEntriesOfProcessDescendants = translateItem(schemaVersion, {
    ...entry,
    entries: [...entry.entries, PROCESS_DESCENDANT_EXTRA_ENTRY],
  }) as TranslatedEntriesOfProcessDescendants;

  return {
    type: entry.type,
    trust_descendants: true,
    entries: translatedEntries.entries,
  };
}

function getMatcherFunction({
  field,
  matchAny,
  os,
}: {
  field: string;
  matchAny?: boolean;
  os: ExceptionListItemSchema['os_types'][number];
}): TranslatedEntryMatcher {
  const doesFieldEndWith: boolean =
    field.endsWith('.caseless') || field.endsWith('.name') || field.endsWith('.text');

  return matchAny
    ? doesFieldEndWith
      ? os === 'linux'
        ? 'exact_cased_any'
        : 'exact_caseless_any'
      : 'exact_cased_any'
    : doesFieldEndWith
    ? os === 'linux'
      ? 'exact_cased'
      : 'exact_caseless'
    : 'exact_cased';
}

function getMatcherWildcardFunction({
  field,
  os,
}: {
  field: string;
  os: ExceptionListItemSchema['os_types'][number];
}): TranslatedEntryMatchWildcardMatcher {
  return field.endsWith('.caseless') || field.endsWith('.text')
    ? os === 'linux'
      ? 'wildcard_cased'
      : 'wildcard_caseless'
    : 'wildcard_cased';
}

function normalizeFieldName(field: string): string {
  return field.endsWith('.caseless') || field.endsWith('.text')
    ? field.substring(0, field.lastIndexOf('.'))
    : field;
}

function translateItem(
  schemaVersion: string,
  item: ExceptionListItemSchema
): TranslatedExceptionListItem {
  const itemSet = new Set();

  const entries: TranslatedExceptionListItem['entries'] = item.entries.reduce<TranslatedEntry[]>(
    (translatedEntries, entry) => {
      const translatedEntry = translateEntry(schemaVersion, item.entries, entry, item.os_types[0]);

      if (translatedEntry !== undefined) {
        if (translatedEntryType.is(translatedEntry)) {
          const itemHash = createHash('sha256')
            .update(JSON.stringify(translatedEntry))
            .digest('hex');
          if (!itemSet.has(itemHash)) {
            translatedEntries.push(translatedEntry);
            itemSet.add(itemHash);
          }
        }
        if (translatedPerformantEntriesType.is(translatedEntry)) {
          translatedEntry.forEach((tpe) => {
            const itemHash = createHash('sha256').update(JSON.stringify(tpe)).digest('hex');
            if (!itemSet.has(itemHash)) {
              translatedEntries.push(tpe);
              itemSet.add(itemHash);
            }
          });
        }
      }

      return translatedEntries;
    },
    []
  );

  return {
    type: item.type,
    entries,
  };
}

function translateEntry(
  schemaVersion: string,
  exceptionListItemEntries: ExceptionListItemSchema['entries'],
  entry: Entry | EntryNested,
  os: ExceptionListItemSchema['os_types'][number]
): TranslatedEntry | TranslatedPerformantEntries | undefined {
  switch (entry.type) {
    case 'nested': {
      const nestedEntries = entry.entries.reduce<TranslatedEntryNestedEntry[]>(
        (entries, nestedEntry) => {
          const translatedEntry = translateEntry(
            schemaVersion,
            exceptionListItemEntries,
            nestedEntry,
            os
          );
          if (nestedEntry !== undefined && translatedEntryNestedEntry.is(translatedEntry)) {
            entries.push(translatedEntry);
          }
          return entries;
        },
        []
      );
      return {
        entries: nestedEntries,
        field: entry.field,
        type: 'nested',
      };
    }
    case 'match': {
      const matcher = getMatcherFunction({ field: entry.field, os });
      return translatedEntryMatchMatcher.is(matcher)
        ? {
            field: normalizeFieldName(entry.field),
            operator: entry.operator,
            type: matcher,
            value: entry.value,
          }
        : undefined;
    }
    case 'match_any': {
      const matcher = getMatcherFunction({ field: entry.field, matchAny: true, os });
      return translatedEntryMatchAnyMatcher.is(matcher)
        ? {
            field: normalizeFieldName(entry.field),
            operator: entry.operator,
            type: matcher,
            value: entry.value,
          }
        : undefined;
    }
    case 'wildcard': {
      const wildcardMatcher = getMatcherWildcardFunction({ field: entry.field, os });
      const translatedEntryWildcardMatcher =
        translatedEntryMatchWildcardMatcher.is(wildcardMatcher);

      const buildEntries = () => {
        if (translatedEntryWildcardMatcher) {
          // default process.executable entry
          const wildcardProcessEntry: TranslatedEntryMatchWildcard = {
            field: normalizeFieldName(entry.field),
            operator: entry.operator,
            type: wildcardMatcher,
            value: entry.value,
          };

          return wildcardProcessEntry;
        }
      };

      return buildEntries();
    }
  }
}
