/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GlobalTimeArgs } from '../../../common/containers/use_global_time';

import type { usersModel } from '../store';

export type UsersTabsProps = GlobalTimeArgs & {
  filterQuery?: string;
  indexNames: string[];
  type: usersModel.UsersType;
};

export type UsersQueryProps = GlobalTimeArgs;
