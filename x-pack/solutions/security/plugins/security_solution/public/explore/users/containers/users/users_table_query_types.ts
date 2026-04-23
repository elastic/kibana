/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageInfoPaginated } from '../../../../../common/search_strategy';
import type { User } from '../../../../../common/search_strategy/security_solution/users/all';
import type { inputsModel } from '../../../../common/store';
import type { InspectResponse } from '../../../../types';

export const USERS_ALL_TABLE_QUERY_ID = 'UsersTable';

export type LoadPage = (newActivePage: number) => void;

export interface UsersListArgs {
  endDate: string;
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: LoadPage;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  startDate: string;
  totalCount: number;
  users: User[];
}
