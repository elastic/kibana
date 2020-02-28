/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { times } from 'lodash';
import { v4 as uuid } from 'uuid';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '../../../../../common/lib';

// date to start writing data
export const START_DATE = '2020-01-01T00:00:00Z';

const DOCUMENT_SOURCE = 'queryDataEndpointTests';

// Create a set of es documents to run the queries against.
// Will create 2 documents for each interval.
// The difference between the dates of the docs will be intervalMillis.
// The date of the last documents will be startDate - intervalMillis / 2.
// So there will be 2 documents written in the middle of each interval range.
// The data value written to each doc is a power of 2, with 2^0 as the value
// of the last documents, the values increasing for older documents.  The
// second document for each time value will be power of 2 + 1
export async function createEsDocuments(
  es: any,
  esTestIndexTool: ESTestIndexTool,
  startDate: string,
  intervals: number,
  intervalMillis: number
) {
  const totalDocuments = intervals * 2;
  const startDateMillis = Date.parse(startDate) - intervalMillis / 2;

  times(intervals, interval => {
    const date = startDateMillis - interval * intervalMillis;

    // base value for each window is 2^window
    const testedValue = 2 ** interval;

    // don't need await on these, wait at the end of the function
    createEsDocument(es, '-na-', date, testedValue, 'groupA');
    createEsDocument(es, '-na-', date, testedValue + 1, 'groupB');
  });

  await esTestIndexTool.waitForDocs(DOCUMENT_SOURCE, '-na-', totalDocuments);
}

async function createEsDocument(
  es: any,
  reference: string,
  epochMillis: number,
  testedValue: number,
  group: string
) {
  const document = {
    source: DOCUMENT_SOURCE,
    reference,
    date: new Date(epochMillis).toISOString(),
    testedValue,
    group,
  };

  const response = await es.index({
    id: uuid(),
    index: ES_TEST_INDEX_NAME,
    body: document,
  });

  if (response.result !== 'created') {
    throw new Error(`document not created: ${JSON.stringify(response)}`);
  }
}
