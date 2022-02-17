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

export async function createEsDocuments(
  es: Client,
  esTestIndexTool: ESTestIndexTool,
  endDate: string = END_DATE,
  intervals: number = 1,
  intervalMillis: number = 1000,
  groups: number = 2
) {
  const endDateMillis = Date.parse(endDate) - intervalMillis / 2;

  let testedValue = 0;
  times(intervals, (interval) => {
    const date = endDateMillis - interval * intervalMillis;

    // don't need await on these, wait at the end of the function
    times(groups, () => {
      createEsDocument(es, date, testedValue++);
    });
  });

  const totalDocuments = intervals * groups;
  await esTestIndexTool.waitForDocs(DOCUMENT_SOURCE, DOCUMENT_REFERENCE, totalDocuments);
}

async function createEsDocument(es: Client, epochMillis: number, testedValue: number) {
  const document = {
    source: DOCUMENT_SOURCE,
    reference: DOCUMENT_REFERENCE,
    date: new Date(epochMillis).toISOString(),
    date_epoch_millis: epochMillis,
    testedValue,
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
