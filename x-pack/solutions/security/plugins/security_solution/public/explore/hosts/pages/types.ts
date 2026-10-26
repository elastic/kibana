/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { hostsModel } from '../store';
import type { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { HOSTS_PATH } from '../../../../common/constants';

/** Tab names for host details routes */
const HOST_DETAILS_TAB_NAMES =
  'events|authentications|uncommonProcesses|anomalies|hostRisk|sessions';

/** Base path for host details (used by details_tabs for route matching) */
export const hostDetailsPagePath = `${HOSTS_PATH}/name/:detailName`;

/** Path for host details tabs (entity resolution uses URL search params). */
export const hostDetailsPagePathWithEntityIdentifiers = `${hostDetailsPagePath}/:tabName(${HOST_DETAILS_TAB_NAMES})`;

export type HostsTabsProps = GlobalTimeArgs & {
  filterQuery?: string;
  indexNames: string[];
  type: hostsModel.HostsType;
};

export type HostsQueryProps = GlobalTimeArgs;
