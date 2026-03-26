/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import React, { useEffect, useState } from 'react';
import type { Subject } from 'rxjs';
import { GroupView } from '../../../../pages/slos/components/grouped_slos/group_view';
import type { ViewType, GroupByField, SortField } from '../../../../pages/slos/types';
import { buildCombinedKqlQuery } from './helpers/build_kql_query';

interface Props {
  groupBy: GroupByField;
  groups?: string[];
  kqlQuery?: string;
  view: ViewType;
  sort?: SortField;
  filters?: Filter[];
  reloadSubject: Subject<boolean>;
}

export function GroupSloView({
  view,
  groupBy = 'status',
  groups = [],
  kqlQuery = '',
  filters = [],
  reloadSubject,
}: Props) {
  const [lastRefreshTime, setLastRefreshTime] = useState<number | undefined>(undefined);
  const combinedKqlQuery = buildCombinedKqlQuery({ groups, groupBy, kqlQuery });

  useEffect(() => {
    reloadSubject?.subscribe(() => {
      setLastRefreshTime(Date.now());
    });
    return () => {
      reloadSubject?.unsubscribe();
    };
  }, [reloadSubject]);

  return (
    <GroupView
      view={view}
      groupBy={groupBy}
      groupsFilter={groups}
      kqlQuery={combinedKqlQuery}
      filters={filters}
      lastRefreshTime={lastRefreshTime}
    />
  );
}
