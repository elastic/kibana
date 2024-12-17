/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UsersTableType, UsersType } from '../../store/model';
import type { GlobalTimeArgs } from '../../../../common/containers/use_global_time';
import type { ESTermQuery } from '../../../../../common/typed_json';
import type { NavTab } from '../../../../common/components/navigation/types';

type KeyUsersNavTab = `${UsersTableType}`;

export type UsersNavTab = Partial<Record<KeyUsersNavTab, NavTab>>;
export interface QueryTabBodyProps {
  type: UsersType;
  startDate: GlobalTimeArgs['from'];
  endDate: GlobalTimeArgs['to'];
  filterQuery?: string | ESTermQuery;
}

export type UsersComponentsQueryProps = QueryTabBodyProps & {
  deleteQuery?: GlobalTimeArgs['deleteQuery'];
  indexNames: string[];
  skip: boolean;
  setQuery: GlobalTimeArgs['setQuery'];
};
