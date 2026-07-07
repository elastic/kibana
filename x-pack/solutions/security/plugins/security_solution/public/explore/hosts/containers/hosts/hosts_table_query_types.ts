/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostsEdges, PageInfoPaginated } from '../../../../../common/search_strategy';
import type { inputsModel } from '../../../../common/store';
import type { InspectResponse } from '../../../../types';

export const HOSTS_ALL_TABLE_QUERY_ID = 'hostsAllQuery';

export type LoadPage = (newActivePage: number) => void;

export interface HostsArgs {
  endDate: string;
  hosts: HostsEdges[];
  id: string;
  inspect: InspectResponse;
  isInspected: boolean;
  loadPage: LoadPage;
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  startDate: string;
  totalCount: number;
}
