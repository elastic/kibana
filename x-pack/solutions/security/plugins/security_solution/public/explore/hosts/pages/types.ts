/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { hostsModel } from '../store';
import type { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { HOSTS_PATH } from '../../../../common/constants';

/** Path for host details when URL includes entityIdentifiers segment for precise entity resolution */
export const hostDetailsPagePathWithEntityIdentifiers = `${HOSTS_PATH}/name/:detailName/:entityIdentifiers`;

export type HostsTabsProps = GlobalTimeArgs & {
  filterQuery?: string;
  indexNames: string[];
  type: hostsModel.HostsType;
};

export type HostsQueryProps = GlobalTimeArgs;
