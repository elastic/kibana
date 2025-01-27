/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HostEcs } from '@kbn/securitysolution-ecs';
import type { Columns } from '../../../components/paginated_table';
import { HostDetailsLink } from '../../../../common/components/links';
import { defaultToEmptyTag, getEmptyValue } from '../../../../common/components/empty_value';
import { getRowItemsWithActions } from '../../../../common/components/tables/helpers';
import type { HostsUncommonProcessesEdges } from '../../../../../common/search_strategy';
import { HostsType } from '../../store/model';
import * as i18n from './translations';

export type UncommonProcessTableColumns = Array<Columns<HostsUncommonProcessesEdges>>;

export const getHostNames = (hosts: HostEcs[]): string[] => {
  if (!hosts) return [];
  return hosts
    .filter((host) => host.name != null && host.name[0] != null)
    .map((host) => (host.name != null && host.name[0] != null ? host.name[0] : ''));
};

export const getUncommonColumns = (): UncommonProcessTableColumns => [
  {
    name: i18n.NAME,
    truncateText: false,
    mobileOptions: { show: true },
    width: '20%',
    render: ({ node }) =>
      getRowItemsWithActions({
        values: node.process.name,
        fieldName: 'process.name',
        idPrefix: `uncommon-process-table-${node._id}-processName`,
      }),
  },
  {
    align: 'right',
    name: i18n.NUMBER_OF_HOSTS,
    truncateText: false,
    mobileOptions: { show: true },
    render: ({ node }) => <>{node.hosts != null ? node.hosts.length : getEmptyValue()}</>,
    width: '8%',
  },
  {
    align: 'right',
    name: i18n.NUMBER_OF_INSTANCES,
    truncateText: false,
    mobileOptions: { show: true },
    render: ({ node }) => defaultToEmptyTag(node.instances),
    width: '8%',
  },
  {
    name: i18n.HOSTS,
    truncateText: false,
    mobileOptions: { show: true },
    width: '25%',
    render: ({ node }) =>
      getRowItemsWithActions({
        values: getHostNames(node.hosts),
        fieldName: 'host.name',
        idPrefix: `uncommon-process-table-${node._id}-processHost`,
        render: (item) => <HostDetailsLink hostName={item} />,
      }),
  },
  {
    name: i18n.LAST_COMMAND,
    truncateText: false,
    mobileOptions: { show: true },
    width: '25%',
    render: ({ node }) =>
      getRowItemsWithActions({
        values: node.process != null ? node.process.args : null,
        fieldName: 'process.args',
        idPrefix: `uncommon-process-table-${node._id}-processArgs`,
        displayCount: 1,
      }),
  },
  {
    name: i18n.LAST_USER,
    truncateText: false,
    mobileOptions: { show: true },
    render: ({ node }) =>
      getRowItemsWithActions({
        values: node.user != null ? node.user.name : null,
        fieldName: 'user.name',
        idPrefix: `uncommon-process-table-${node._id}-processUser`,
      }),
  },
];

export const getUncommonColumnsCurated = (pageType: HostsType): UncommonProcessTableColumns => {
  const columns: UncommonProcessTableColumns = getUncommonColumns();

  if (pageType === HostsType.details) {
    const columnsToRemove = new Set([i18n.HOSTS, i18n.NUMBER_OF_HOSTS]);
    return columns.filter(
      (column) => typeof column.name === 'string' && !columnsToRemove.has(column.name)
    );
  }

  return columns;
};
