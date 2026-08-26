/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-plugin/common';
import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { HostsTableType } from '../../store/model';
import type { HostsQueryProps } from '../types';
import type { NavTab } from '../../../../common/components/navigation/types';
import type { KeyHostsNavTabWithoutMlPermission } from '../navigation/types';
import type { hostsModel } from '../../store';

interface HostBodyComponentDispatchProps {
  detailName: string;
  identityFields?: Record<string, string>;
  entityId?: string;
  hostDetailsPagePath: string;
}

export interface HostDetailsProps {
  detailName: string;
  identityFields?: Record<string, string>;
  entityId?: string;
  hostDetailsPagePath: string;
}

type KeyHostDetailsNavTabWithoutMlPermission = HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostDetailsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission &
  HostsTableType.anomalies;

type KeyHostDetailsNavTab =
  | KeyHostDetailsNavTabWithoutMlPermission
  | KeyHostDetailsNavTabWithMlPermission;

export type HostDetailsNavTab = Record<KeyHostDetailsNavTab, NavTab>;

export type HostDetailsTabsProps = HostBodyComponentDispatchProps &
  HostsQueryProps & {
    indexNames: string[];
    /**
     * Filter for host identity (either generated from euidApi or fallback host.name filter)
     */
    hostDetailsFilter: Filter[];
    /**
     * Stringified filter query that includes the host identity filter
     * (either generated from euidApi or fallback host.name filter) and any global filters applied on the page.
     */
    filterQuery?: string;
    dataViewSpec?: DataViewSpec;
    type: hostsModel.HostsType;
    identityFields?: Record<string, string>;
    entityId?: string;
    entityRecord?: EntityStoreRecord | null;
  };
