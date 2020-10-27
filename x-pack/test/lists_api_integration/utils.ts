/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SuperTest } from 'supertest';
import supertestAsPromised from 'supertest-as-promised';
import { Client } from '@elastic/elasticsearch';

import {
  ListItemSchema,
  ExceptionListSchema,
  ExceptionListItemSchema,
} from '../../plugins/lists/common/schemas';
import { ListSchema } from '../../plugins/lists/common';
import { LIST_INDEX } from '../../plugins/lists/common/constants';
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
      reject(new Error('timed out waiting for function condition to be true'));
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
