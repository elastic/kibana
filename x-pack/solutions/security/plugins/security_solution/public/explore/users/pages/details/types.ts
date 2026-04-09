/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCreator } from 'typescript-fsa';

import type { Filter, Query } from '@kbn/es-query';

import type { UsersQueryProps } from '../types';
import type { NavTab } from '../../../../common/components/navigation/types';

import type { UsersDetailsTableType } from '../../store/model';
import type { usersModel } from '../../store';

interface UsersDetailsComponentReduxProps {
  query: Query;
  filters: Filter[];
  entityId?: string;
  identityFields?: Record<string, string>;
}

interface UserBodyComponentDispatchProps {
  detailName: string;
  usersDetailsPagePath: string;
  entityId?: string;
  identityFields?: Record<string, string>;
}

interface UsersDetailsComponentDispatchProps extends UserBodyComponentDispatchProps {
  setUsersDetailsTablesActivePageToZero: ActionCreator<null>;
}

export interface UsersDetailsProps {
  detailName: string;
  usersDetailsPagePath: string;
  entityId?: string;
  identityFields?: Record<string, string>;
}

export type UsersDetailsComponentProps = UsersDetailsComponentReduxProps &
  UsersDetailsComponentDispatchProps &
  UsersQueryProps;

type KeyUsersDetailsNavTab = `${UsersDetailsTableType}`;

export type UsersDetailsNavTab = Partial<Record<KeyUsersDetailsNavTab, NavTab>>;

export type UsersDetailsTabsProps = UserBodyComponentDispatchProps &
  UsersQueryProps & {
    indexNames: string[];
    userDetailFilter: Filter[];
    /**
     * Serialized ES query built with {@link UsersDetailsTabsProps.userDetailFilter} (identity fields
     * when Entity Store v2). Used for the Events histogram, Authentications tab, and Risk tab; other
     * tabs use {@link UsersDetailsTabsProps.filterQuery} only.
     */
    userDetailsIdentityFilterQuery?: string;
    filterQuery?: string;
    type: usersModel.UsersType;
    entityId?: string;
    identityFields?: Record<string, string>;
  };
