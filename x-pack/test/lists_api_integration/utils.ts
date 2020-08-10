/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SuperTest } from 'supertest';
import supertestAsPromised from 'supertest-as-promised';

import { ListSchema } from '../../plugins/lists/common';
import { LIST_INDEX } from '../../plugins/lists/common/constants';

/**
 * Creates the lists and lists items index for use inside of beforeEach blocks of tests
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param supertest The supertest client library
 */
export const createListsIndex = async (
  supertest: SuperTest<supertestAsPromised.Test>,
  retryCount = 20
): Promise<void> => {
  if (retryCount > 0) {
    try {
      await supertest.post(LIST_INDEX).set('kbn-xsrf', 'true').send();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(
        `Failure trying to create the lists index, retries left are: ${retryCount - 1}`,
        err
      );
      await createListsIndex(supertest, retryCount - 1);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('Could not createListsIndex, no retries are left');
  }
};

/**
 * Deletes the lists index for use inside of afterEach blocks of tests
 * @param supertest The supertest client library
 */
export const deleteListsIndex = async (
  supertest: SuperTest<supertestAsPromised.Test>,
  retryCount = 20
): Promise<void> => {
  if (retryCount > 0) {
    try {
      await supertest.delete(LIST_INDEX).set('kbn-xsrf', 'true').send();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(`Failure trying to deleteListsIndex, retries left are: ${retryCount - 1}`, err);
      await deleteListsIndex(supertest, retryCount - 1);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('Could not deleteListsIndex, no retries are left');
  }
};

/**
 * This will remove server generated properties such as date times, etc...
 * @param list List to pass in to remove typical server generated properties
 */
export const removeServerGeneratedProperties = (list: Partial<ListSchema>): Partial<ListSchema> => {
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  const { created_at, updated_at, id, tie_breaker_id, _version, ...removedProperties } = list;
  return removedProperties;
};
