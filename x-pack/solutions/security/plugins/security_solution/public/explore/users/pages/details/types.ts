/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

import type { UsersQueryProps } from '../types';
import type { NavTab } from '../../../../common/components/navigation/types';

import type { UsersDetailsTableType } from '../../store/model';
import type { usersModel } from '../../store';

interface UserBodyComponentDispatchProps {
  detailName: string;
  usersDetailsPagePath: string;
}

export interface UsersDetailsProps {
  detailName: string;
  usersDetailsPagePath: string;
}

type KeyUsersDetailsNavTab = `${UsersDetailsTableType}`;

export type UsersDetailsNavTab = Partial<Record<KeyUsersDetailsNavTab, NavTab>>;

export type UsersDetailsTabsProps = UserBodyComponentDispatchProps &
  UsersQueryProps & {
    indexNames: string[];
    userDetailFilter: Filter[];
    filterQuery?: string;
    type: usersModel.UsersType;
  };
