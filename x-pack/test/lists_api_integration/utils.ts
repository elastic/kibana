/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SuperTest } from 'supertest';
import supertestAsPromised from 'supertest-as-promised';
import { Client } from '@elastic/elasticsearch';

import { getImportListItemAsBuffer } from '../../plugins/lists/common/schemas/request/import_list_item_schema.mock';
import {
  ListItemSchema,
  ExceptionListSchema,
  ExceptionListItemSchema,
  Type,
} from '../../plugins/lists/common/schemas';
import { ListSchema } from '../../plugins/lists/common';
import { LIST_INDEX, LIST_ITEM_URL } from '../../plugins/lists/common/constants';
import { countDownES, countDownTest } from '../detection_engine_api_integration/utils';

/**
 * Creates the lists and lists items index for use inside of beforeEach blocks of tests
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param supertest The supertest client library
 */
export const createListsIndex = async (
  supertest: SuperTest<supertestAsPromised.Test>
): Promise<void> => {
  return countDownTest(async () => {
    await supertest.post(LIST_INDEX).set('kbn-xsrf', 'true').send();
    return true;
  }, 'createListsIndex');
};

/**
 * Deletes the lists index for use inside of afterEach blocks of tests
 * @param supertest The supertest client library
 */
export const deleteListsIndex = async (
  supertest: SuperTest<supertestAsPromised.Test>
): Promise<void> => {
  return countDownTest(async () => {
    await supertest.delete(LIST_INDEX).set('kbn-xsrf', 'true').send();
    return true;
  }, 'deleteListsIndex');
};

/**
 * Creates the exception lists and lists items index for use inside of beforeEach blocks of tests
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param supertest The supertest client library
 */
export const createExceptionListsIndex = async (
  supertest: SuperTest<supertestAsPromised.Test>
): Promise<void> => {
  return countDownTest(async () => {
    await supertest.post(LIST_INDEX).set('kbn-xsrf', 'true').send();
    return true;
  }, 'createListsIndex');
};

/**
 * This will remove server generated properties such as date times, etc...
 * @param list List to pass in to remove typical server generated properties
 */
export const removeListServerGeneratedProperties = (
  list: Partial<ListSchema>
): Partial<ListSchema> => {
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  const { created_at, updated_at, id, tie_breaker_id, _version, ...removedProperties } = list;
  return removedProperties;
};

/**
 * This will remove server generated properties such as date times, etc...
 * @param list List to pass in to remove typical server generated properties
 */
export const removeListItemServerGeneratedProperties = (
  list: Partial<ListItemSchema>
): Partial<ListItemSchema> => {
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  const { created_at, updated_at, id, tie_breaker_id, _version, ...removedProperties } = list;
  return removedProperties;
};

/**
 * This will remove server generated properties such as date times, etc...
 * @param list List to pass in to remove typical server generated properties
 */
export const removeExceptionListItemServerGeneratedProperties = (
  list: Partial<ExceptionListItemSchema>
): Partial<ExceptionListItemSchema> => {
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  const { created_at, updated_at, id, tie_breaker_id, _version, ...removedProperties } = list;
  return removedProperties;
};

/**
 * This will remove server generated properties such as date times, etc...
 * @param list List to pass in to remove typical server generated properties
 */
export const removeExceptionListServerGeneratedProperties = (
  list: Partial<ExceptionListSchema>
): Partial<ExceptionListSchema> => {
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  const { created_at, updated_at, id, tie_breaker_id, _version, ...removedProperties } = list;
  return removedProperties;
};

// Similar to ReactJs's waitFor from here: https://testing-library.com/docs/dom-testing-library/api-async#waitfor
export const waitFor = async (
  functionToTest: () => Promise<boolean>,
  functionName: string,
  maxTimeout: number = 5000,
  timeoutWait: number = 10
) => {
  await new Promise(async (resolve, reject) => {
    let found = false;
    let numberOfTries = 0;
    while (!found && numberOfTries < Math.floor(maxTimeout / timeoutWait)) {
      const itPasses = await functionToTest();
      if (itPasses) {
        found = true;
      } else {
        numberOfTries++;
      }
      await new Promise((resolveTimeout) => setTimeout(resolveTimeout, timeoutWait));
    }
    if (found) {
      resolve();
    } else {
      reject(new Error(`timed out waiting for function ${functionName} condition to be true`));
    }
  });
};

/**
 * Useful for export_api testing to convert from a multi-part binary back to a string
 * @param res Response
 * @param callback Callback
 */
export const binaryToString = (res: any, callback: any): void => {
  res.setEncoding('binary');
  res.data = '';
  res.on('data', (chunk: any) => {
    res.data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(res.data));
  });
};

/**
 * Remove all exceptions from the .kibana index
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param es The ElasticSearch handle
 */
export const deleteAllExceptions = async (es: Client): Promise<void> => {
  return countDownES(async () => {
    return es.deleteByQuery({
      index: '.kibana',
      q: 'type:exception-list or type:exception-list-agnostic',
      wait_for_completion: true,
      refresh: true,
      body: {},
    });
  }, 'deleteAllExceptions');
};

/**
 * Convenience function for quickly importing a given type and contents and then
 * waiting to ensure they're there before continuing
 * @param supertest The super test agent
 * @param type The type to import as
 * @param contents The contents of the import
 * @param fileName filename to import as
 */
export const importFile = async (
  supertest: SuperTest<supertestAsPromised.Test>,
  type: Type,
  contents: string[],
  fileName: string
): Promise<void> => {
  await supertest
    .post(`${LIST_ITEM_URL}/_import?type=${type}`)
    .set('kbn-xsrf', 'true')
    .attach('file', getImportListItemAsBuffer(contents), fileName)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(200);

  // although we have pushed the list and its items, it is async so we
  // have to wait for the contents before continuing
  await waitForListItems(supertest, contents, fileName);
};

/**
 * Convenience function for quickly importing a given type and contents and then
 * waiting to ensure they're there before continuing. This specifically checks tokens
 * from text file
 * @param supertest The super test agent
 * @param type The type to import as
 * @param contents The contents of the import
 * @param fileName filename to import as
 */
export const importTextFile = async (
  supertest: SuperTest<supertestAsPromised.Test>,
  type: Type,
  contents: string[],
  fileName: string
): Promise<void> => {
  await supertest
    .post(`${LIST_ITEM_URL}/_import?type=${type}`)
    .set('kbn-xsrf', 'true')
    .attach('file', getImportListItemAsBuffer(contents), fileName)
    .expect('Content-Type', 'application/json; charset=utf-8')
    .expect(200);

  // although we have pushed the list and its items, it is async so we
  // have to wait for the contents before continuing
  await waitForTextListItems(supertest, contents, fileName);
};

/**
 * Convenience function for waiting for a particular file uploaded
 * and a particular item value to be available before continuing.
 * @param supertest The super test agent
 * @param fileName The filename imported
 * @param itemValue The item value to wait for
 */
export const waitForListItem = async (
  supertest: SuperTest<supertestAsPromised.Test>,
  itemValue: string,
  fileName: string
): Promise<void> => {
  await waitFor(async () => {
    const { status } = await supertest
      .get(`${LIST_ITEM_URL}?list_id=${fileName}&value=${itemValue}`)
      .send();

    return status === 200;
  }, `waitForListItem fileName: "${fileName}" itemValue: "${itemValue}"`);
};

/**
 * Convenience function for waiting for a particular file uploaded
 * and particular item values to be available before continuing.
 * @param supertest The super test agent
 * @param fileName The filename imported
 * @param itemValue The item value to wait for
 */
export const waitForListItems = async (
  supertest: SuperTest<supertestAsPromised.Test>,
  itemValues: string[],
  fileName: string
): Promise<void> => {
  await Promise.all(itemValues.map((item) => waitForListItem(supertest, item, fileName)));
};

/**
 * Convenience function for waiting for a particular file uploaded
 * and a particular item value to be available before continuing.
 * @param supertest The super test agent
 * @param fileName The filename imported
 * @param itemValue The item value to wait for
 */
export const waitForTextListItem = async (
  supertest: SuperTest<supertestAsPromised.Test>,
  itemValue: string,
  fileName: string
): Promise<void> => {
  const tokens = itemValue.split(' ');
  await waitFor(async () => {
    const promises = await Promise.all(
      tokens.map(async (token) => {
        const { status } = await supertest
          .get(`${LIST_ITEM_URL}?list_id=${fileName}&value=${token}`)
          .send();
        return status === 200;
      })
    );
    return promises.every((one) => one);
  }, `waitForTextListItem fileName: "${fileName}" itemValue: "${itemValue}"`);
};

/**
 * Convenience function for waiting for a particular file uploaded
 * and particular item values to be available before continuing. This works
 * specifically with text types and does tokenization to ensure all words are uploaded
 * @param supertest The super test agent
 * @param fileName The filename imported
 * @param itemValue The item value to wait for
 */
export const waitForTextListItems = async (
  supertest: SuperTest<supertestAsPromised.Test>,
  itemValues: string[],
  fileName: string
): Promise<void> => {
  await Promise.all(itemValues.map((item) => waitForTextListItem(supertest, item, fileName)));
};
