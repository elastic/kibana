/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import { times } from 'lodash';
import { v4 as uuid } from 'uuid';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '../../../../../common/lib';

// default end date
export const END_DATE = '2020-01-01T00:00:00Z';

export const DOCUMENT_SOURCE = 'queryDataEndpointTests';
export const DOCUMENT_REFERENCE = '-na-';

// Create a set of es documents to run the queries against.
// Will create `groups` documents for each interval.
// The difference between the dates of the docs will be intervalMillis.
// The date of the last documents will be startDate - intervalMillis / 2.
// So the documents will be written in the middle of each interval range.
// The data value written to each doc is a power of 2 + the group index, with
// 2^0 as the value of the last documents, the values increasing for older
// documents.
export async function createEsDocuments(
  es: Client,
  esTestIndexTool: ESTestIndexTool,
  endDate: string = END_DATE,
  intervals: number = 1,
  intervalMillis: number = 1000,
  groups: number = 2
) {
  const endDateMillis = Date.parse(endDate) - intervalMillis / 2;

  const promises: Array<Promise<unknown>> = [];
  times(intervals, (interval) => {
    const date = endDateMillis - interval * intervalMillis;

    // base value for each window is 2^interval
    const testedValue = 2 ** interval;

    // don't need await on these, wait at the end of the function
    times(groups, (group) => {
      promises.push(createEsDocument(es, date, testedValue + group, `group-${group}`));
    });
  });
  await Promise.all(promises);

  const totalDocuments = intervals * groups;
  await esTestIndexTool.waitForDocs(DOCUMENT_SOURCE, DOCUMENT_REFERENCE, totalDocuments);
}

async function createEsDocument(
  es: Client,
  epochMillis: number,
  testedValue: number,
  group: string
) {
  const document = {
    source: DOCUMENT_SOURCE,
    reference: DOCUMENT_REFERENCE,
    date: new Date(epochMillis).toISOString(),
    date_epoch_millis: epochMillis,
    testedValue,
    group,
  };

  const response = await es.index({
    id: uuid(),
    index: ES_TEST_INDEX_NAME,
    refresh: 'wait_for',
    body: document,
  });
  // console.log(`writing document to ${ES_TEST_INDEX_NAME}:`, JSON.stringify(document, null, 4));

  if (response.result !== 'created') {
    throw new Error(`document not created: ${JSON.stringify(response)}`);
  }
}
