/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';
import type { SyntheticsEsClient } from '../lib';

export interface IndexPatternTitleAndFields {
  title: string;
  fields: FieldDescriptor[];
}

export const getUptimeIndexPattern = async ({
  syntheticsEsClient,
}: {
  syntheticsEsClient: SyntheticsEsClient;
}): Promise<IndexPatternTitleAndFields | undefined> => {
  const indexPatternsFetcher = new IndexPatternsFetcher(syntheticsEsClient.baseESClient);

  try {
    const { fields } = await indexPatternsFetcher.getFieldsForWildcard({
      pattern: SYNTHETICS_INDEX_PATTERN,
    });

    return {
      fields,
      title: SYNTHETICS_INDEX_PATTERN,
    };
  } catch (e) {
    const notExists = e.output?.statusCode === 404;
    if (notExists) {
      // eslint-disable-next-line no-console
      console.error(
        `Could not get dynamic index pattern because indices "${SYNTHETICS_INDEX_PATTERN}" don't exist`
      );
      return;
    }

    // re-throw
    throw e;
  }
};
