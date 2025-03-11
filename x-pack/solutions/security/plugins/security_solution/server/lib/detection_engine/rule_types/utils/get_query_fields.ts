/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import { queryToFields } from '@kbn/data-plugin/common';
import type { LanguageOrUndefined } from '@kbn/securitysolution-io-ts-alerting-types';

interface GetQueryFieldsArgs {
  dataViews: DataViewsContract;
  index: string[];
  query: string;
  language: LanguageOrUndefined;
}

export const getQueryFields = async ({ dataViews, index, query, language }: GetQueryFieldsArgs) => {
  const dataViewLazy = await dataViews.createDataViewLazy({
    title: index.join(),
  });
  return Object.values(
    await queryToFields({
      dataView: dataViewLazy,
      request: { query: [{ query, language: language || 'kuery' }] },
    })
  );
};
