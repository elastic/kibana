/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, Example } from 'langsmith';
import type { Logger } from '@kbn/core/server';
import { isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';

/**
 * Fetches a dataset from LangSmith. Note that `client` will use env vars unless langSmithApiKey is specified
 *
 * @param datasetName
 * @param logger
 * @param langSmithApiKey
 */
export const fetchLangSmithDataset = async (
  datasetName: string | undefined,
  logger: Logger,
  langSmithApiKey?: string
): Promise<Example[]> => {
  if (datasetName === undefined || (langSmithApiKey == null && !isLangSmithEnabled())) {
    throw new Error('LangSmith dataset name not provided or LangSmith not enabled');
  }

  try {
    const client = new Client({ apiKey: langSmithApiKey });

    const examples = [];
    for await (const example of client.listExamples({ datasetName })) {
      examples.push(example);
    }

    return examples;
  } catch (e) {
    logger.error(`Error fetching dataset from LangSmith: ${e.message}`);
    return [];
  }
};

/**
 * Fetches all LangSmith datasets.  Note that `client` will use env vars unless langSmithApiKey is specified
 *
 * @param logger
 * @param langSmithApiKey
 */
export const fetchLangSmithDatasets = async ({
  logger,
  langSmithApiKey,
}: {
  logger: Logger;
  langSmithApiKey?: string;
}): Promise<string[]> => {
  try {
    const client = new Client({ apiKey: langSmithApiKey });
    const datasets = [];
    for await (const dataset of client.listDatasets()) {
      datasets.push(dataset);
    }

    return datasets.map((d) => d.name).sort();
  } catch (e) {
    logger.error(`Error fetching datasets from LangSmith: ${e.message}`);
    return [];
  }
};
