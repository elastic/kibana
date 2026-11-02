/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';

import type { Filter, Query } from '@kbn/es-query';
import { type DataView, getEsQueryConfig } from '@kbn/data-plugin/common';
import { ID as OverviewHostQueryId } from '../../containers/overview_host';
import { OverviewHost } from '../overview_host';
import { OverviewNetwork } from '../overview_network';
import { useKibana } from '../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../common/lib/kuery';
import type { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import {
  fieldNameExistsFilter,
  sourceOrDestinationIpExistsFilter,
} from '../../../common/components/visualization_actions/utils';
import { SecurityPageName } from '../../../../common/constants';

interface Props extends Pick<GlobalTimeArgs, 'from' | 'to' | 'setQuery'> {
  filters: Filter[];
  indexNames: string[];
  dataView: DataView;
  query: Query;
}

const EventCountsComponent: React.FC<Props> = ({
  filters,
  from,
  indexNames,
  dataView,
  query,
  setQuery,
  to,
}) => {
  const { uiSettings } = useKibana().services;

  const [hostFilterQuery, hostKqlError] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        dataView,
        queries: [query],
        filters: [...filters, ...fieldNameExistsFilter(SecurityPageName.hosts)],
      }),
    [filters, dataView, query, uiSettings]
  );

  const [networkFilterQuery] = useMemo(
    () =>
      convertToBuildEsQuery({
        config: getEsQueryConfig(uiSettings),
        dataView,
        queries: [query],
        filters: [...filters, ...sourceOrDestinationIpExistsFilter],
      }),
    [uiSettings, dataView, query, filters]
  );

  useInvalidFilterQuery({
    id: OverviewHostQueryId,
    filterQuery: hostFilterQuery || networkFilterQuery,
    kqlError: hostKqlError,
    query,
    startDate: from,
    endDate: to,
  });

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={1}>
        <OverviewHost
          endDate={to}
          filterQuery={hostFilterQuery}
          indexNames={indexNames}
          startDate={from}
          setQuery={setQuery}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={1}>
        <OverviewNetwork
          endDate={to}
          filterQuery={networkFilterQuery}
          indexNames={indexNames}
          startDate={from}
          setQuery={setQuery}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EventCounts = React.memo(EventCountsComponent);
