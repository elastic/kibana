/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Optional } from 'utility-types';

import type { DataViewBase } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-plugin/common';
import type { ESTermQuery } from '../../../../../common/typed_json';

import type { NavTab } from '../../../../common/components/navigation/types';
import type { FlowTargetSourceDest } from '../../../../../common/search_strategy/security_solution/network';
import type { networkModel } from '../../store';
import type { GlobalTimeArgs } from '../../../../common/containers/use_global_time';

export interface QueryTabBodyProps extends Pick<GlobalTimeArgs, 'setQuery' | 'deleteQuery'> {
  endDate: string;
  filterQuery?: string | ESTermQuery;
  indexNames: string[];
  ip?: string;
  skip: boolean;
  startDate: string;
  type: networkModel.NetworkType;
}

export type NetworkComponentQueryProps = QueryTabBodyProps;

export type IPsQueryTabBodyProps = QueryTabBodyProps & {
  flowTarget: FlowTargetSourceDest;
  indexPattern: DataViewBase;
};

export type FTQueryTabBodyProps = QueryTabBodyProps & {
  flowTarget: FlowTargetSourceDest;
};

export type IPQueryTabBodyProps = FTQueryTabBodyProps & {
  ip: string;
};

export type HttpQueryTabBodyProps = QueryTabBodyProps;

export type NetworkRoutesProps = GlobalTimeArgs & {
  type: networkModel.NetworkType;
  filterQuery?: string | ESTermQuery;
  dataViewSpec: DataViewSpec;
  indexNames: string[];
};

export enum NetworkRouteType {
  flows = 'flows',
  dns = 'dns',
  anomalies = 'anomalies',
  tls = 'tls',
  http = 'http',
  events = 'events',
}

export type NetworkNavTab = Optional<Record<`${NetworkRouteType}`, NavTab>, 'anomalies'>;

export type GetNetworkRoutePath = (
  capabilitiesFetched: boolean,
  hasMlUserPermission: boolean
) => string;
