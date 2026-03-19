/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { isEmpty } from 'lodash/fp';
import { generatePath } from 'react-router-dom';
import { appendSearch } from '../../../common/components/link_to/helpers';
import { AdministrationSubTab } from '../../types';
import type { ScriptsLibraryUrlParams } from '../../pages/scripts_library/view/components/scripts_library_url_params';
import { MANAGEMENT_ROUTING_SCRIPTS_LIBRARY_PATH } from '../constants';

type ExactKeys<T1, T2> = Exclude<keyof T1, keyof T2> extends never ? T1 : never;
type Exact<T, Shape> = T extends Shape ? ExactKeys<T, Shape> : never;

const queryStringify = <ExpectedType, ArgType>(params: Exact<ExpectedType, ArgType>): string =>
  querystring.stringify(params as unknown as querystring.ParsedUrlQueryInput);

const getNonEmptyUrlParams = <T extends object>(query: T): Partial<T> => {
  const filteredQuery: Partial<T> = {};
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      filteredQuery[key as keyof T] = value as T[keyof T];
    }
  });
  return filteredQuery;
};

export const getScriptsLibraryPath = ({
  query,
  search,
}: {
  query: ScriptsLibraryUrlParams;
  search?: string;
}) => {
  const filteredQuery = getNonEmptyUrlParams<ScriptsLibraryUrlParams>(query);
  const urlQueryParams = queryStringify<ScriptsLibraryUrlParams, typeof filteredQuery>(
    filteredQuery
  );
  const urlSearch = `${urlQueryParams && !isEmpty(search) ? '&' : ''}${search ?? ''}`;

  return `${generatePath(MANAGEMENT_ROUTING_SCRIPTS_LIBRARY_PATH, {
    tabName: AdministrationSubTab.scriptsLibrary,
  })}${appendSearch(`${urlQueryParams ? `${urlQueryParams}${urlSearch}` : urlSearch}`)}`;
};

export const getScriptsDetailPath = ({
  query,
  search,
}: {
  query: ScriptsLibraryUrlParams;
  search?: string;
}) => {
  const filteredQuery = getNonEmptyUrlParams<ScriptsLibraryUrlParams>(query);
  const urlQueryParams = queryStringify<ScriptsLibraryUrlParams, typeof filteredQuery>(
    filteredQuery
  );
  const urlSearch = `${urlQueryParams && !isEmpty(search) ? '&' : ''}${search ?? ''}`;

  const returnUrl = `${generatePath(MANAGEMENT_ROUTING_SCRIPTS_LIBRARY_PATH, {
    tabName: AdministrationSubTab.scriptsLibrary,
  })}${appendSearch(`${urlQueryParams ? `${urlQueryParams}${urlSearch}` : urlSearch}`)}`;

  return returnUrl;
};
