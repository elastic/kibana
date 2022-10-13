/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type {
  CreateExceptionListItemSchema,
  ListArray,
  NonEmptyEntriesArray,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';

import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { createExceptionListItem } from './create_exception_list_item';
import { waitFor } from './wait_for';
import { createExceptionList } from './create_exception_list';

/**
 * Convenience testing function where you can pass in just the endpoint entries and you will
 * get a container created with the entries.
 * @param supertest super test agent
 * @param endpointEntries The endpoint entries to create the rule and exception list from
 * @param osTypes The os types to optionally add or not to add to the container
 */
export const createContainerWithEndpointEntries = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  endpointEntries: Array<{
    entries: NonEmptyEntriesArray;
    osTypes: OsTypeArray | undefined;
  }>
): Promise<ListArray> => {
  // If not given any endpoint entries, return without any
  if (endpointEntries.length === 0) {
    return [];
  }

  // create the endpoint exception list container
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
    description: 'endpoint description',
    list_id: 'endpoint_list',
    name: 'endpoint_list',
    type: 'endpoint',
  });

  // Add the endpoint exception list container to the backend
  await Promise.all(
    endpointEntries.map((endpointEntry) => {
      const exceptionListItem: CreateExceptionListItemSchema = {
        description: 'endpoint description',
        entries: endpointEntry.entries,
        list_id: 'endpoint_list',
        name: 'endpoint_list',
        os_types: endpointEntry.osTypes,
        type: 'simple',
      };
      return createExceptionListItem(supertest, log, exceptionListItem);
    })
  );

  // To reduce the odds of in-determinism and/or bugs we ensure we have
  // the same length of entries before continuing.
  await waitFor(
    async () => {
      const { body } = await supertest.get(`${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${list_id}`);
      return body.data.length === endpointEntries.length;
    },
    `within createContainerWithEndpointEntries ${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${list_id}`,
    log
  );

  return [
    {
      id,
      list_id,
      namespace_type,
      type,
    },
  ];
};
