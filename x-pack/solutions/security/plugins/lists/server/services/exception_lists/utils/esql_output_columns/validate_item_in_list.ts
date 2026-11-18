/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import {
  EXCEPTION_APPLIES_TO,
  getExceptionAppliesTo,
  isEsqlOutputColumnsItem,
} from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type { ExceptionAppliesTo } from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';

import { getExceptionList } from '../../get_exception_list';

import { validateEsqlOutputColumnsItem } from './validate_item';

type Entries = Parameters<typeof validateEsqlOutputColumnsItem>[0]['entries'];

interface AppliesToChange {
  /** what the stored item applies to, `undefined` when it does not say */
  stored: ExceptionAppliesTo | null | undefined;
  /** what the request says that the item applies to, `undefined` when it does not say */
  requested: ExceptionAppliesTo | null | undefined;
}

/**
 * An item cannot change what it applies to. A client that reads an item and writes it back, and does not know
 * `applies_to`, would drop it and turn an item on the output columns into one on the source documents, which would
 * then exclude other alerts than it was written for.
 */
export const assertAppliesToIsNotChanged = ({ stored, requested }: AppliesToChange): void => {
  const storedAppliesTo = getExceptionAppliesTo({ applies_to: stored });
  const requestedAppliesTo = getExceptionAppliesTo({ applies_to: requested });
  if (storedAppliesTo !== requestedAppliesTo) {
    throw new BadRequestError(
      `Invalid exception item: it applies to "${storedAppliesTo}" and cannot change to "${requestedAppliesTo}"`
    );
  }
};

/**
 * Validates an item that is written to a list: the entries need to fit what the item applies to, and an item that
 * applies to the ES|QL output columns can only be in a list of the types that allow it.
 */
export const validateItemForList = async ({
  savedObjectsClient,
  namespaceType,
  listId,
  appliesTo,
  entries,
  osTypes,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  listId: string;
  appliesTo: ExceptionAppliesTo | null | undefined;
  entries: Entries;
  osTypes: readonly string[] | null | undefined;
}): Promise<void> => {
  // The list is only read for the items that need its type
  const list = isEsqlOutputColumnsItem({ applies_to: appliesTo })
    ? await getExceptionList({ id: undefined, listId, namespaceType, savedObjectsClient })
    : null;
  validateEsqlOutputColumnsItem({
    appliesTo: appliesTo ?? EXCEPTION_APPLIES_TO.SOURCE_DOCUMENTS,
    entries,
    listType: list?.type,
    osTypes,
  });
};
