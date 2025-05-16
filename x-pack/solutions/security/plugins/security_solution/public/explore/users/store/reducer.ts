/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { set } from '@kbn/safer-lodash-set/fp';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../../common/store/constants';

import {
  removeUserAssetTableField,
  setUsersTablesActivePageToZero,
  updateTableActivePage,
  updateTableLimit,
  updateTableSorting,
  updateUserRiskScoreSeverityFilter,
  updateUsersAnomaliesInterval,
  updateUsersAnomaliesJobIdFilter,
  addUserAssetTableField,
} from './actions';
import {
  addAssetTableField,
  removeAssetTableField,
  setUsersPageQueriesActivePageToZero,
} from './helpers';
import type { UsersModel } from './model';
import { UserAssetTableType, UsersTableType } from './model';
import { Direction } from '../../../../common/search_strategy/common';
import { RiskScoreFields } from '../../../../common/search_strategy';
import { UsersFields } from '../../../../common/search_strategy/security_solution/users/common';
import { USER_ASSET_TABLE_DEFAULTS_FIELDS } from './constants';
import { getUserAssetTableFromStorage } from './storage';

export type UsersState = UsersModel;

export const getInitialUsersState = (storage: Storage): UsersState => {
  const userAssetTable = getUserAssetTableFromStorage(storage);
  return {
    page: {
      queries: {
        [UsersTableType.allUsers]: {
          activePage: DEFAULT_TABLE_ACTIVE_PAGE,
          limit: DEFAULT_TABLE_LIMIT,
          sort: {
            field: UsersFields.lastSeen,
            direction: Direction.desc,
          },
        },
        [UsersTableType.authentications]: {
          activePage: DEFAULT_TABLE_ACTIVE_PAGE,
          limit: DEFAULT_TABLE_LIMIT,
        },
        [UsersTableType.risk]: {
          activePage: DEFAULT_TABLE_ACTIVE_PAGE,
          limit: DEFAULT_TABLE_LIMIT,
          sort: {
            field: RiskScoreFields.userRiskScore,
            direction: Direction.desc,
          },
          severitySelection: [],
        },
        [UsersTableType.anomalies]: {
          jobIdSelection: [],
          intervalSelection: 'auto',
        },
        [UsersTableType.events]: {
          activePage: DEFAULT_TABLE_ACTIVE_PAGE,
          limit: DEFAULT_TABLE_LIMIT,
        },
      },
    },
    details: {
      queries: {
        [UsersTableType.anomalies]: {
          jobIdSelection: [],
          intervalSelection: 'auto',
        },
        [UsersTableType.events]: {
          activePage: DEFAULT_TABLE_ACTIVE_PAGE,
          limit: DEFAULT_TABLE_LIMIT,
        },
      },
    },
    flyout: {
      queries: {
        [UserAssetTableType.assetEntra]: (userAssetTable &&
          userAssetTable[UserAssetTableType.assetEntra]) ?? {
          fields: USER_ASSET_TABLE_DEFAULTS_FIELDS[UserAssetTableType.assetEntra],
        },

        [UserAssetTableType.assetOkta]: (userAssetTable &&
          userAssetTable[UserAssetTableType.assetOkta]) ?? {
          fields: USER_ASSET_TABLE_DEFAULTS_FIELDS[UserAssetTableType.assetOkta],
        },
      },
    },
  };
};

export const makeUsersReducer = (storage: Storage) =>
  reducerWithInitialState(getInitialUsersState(storage))
    .case(setUsersTablesActivePageToZero, (state) => ({
      ...state,
      page: {
        ...state.page,
        queries: setUsersPageQueriesActivePageToZero(state),
      },
    }))
    .case(updateTableActivePage, (state, { activePage, tableType }) => ({
      ...state,
      page: {
        ...state.page,
        queries: {
          ...state.page.queries,
          [tableType]: {
            ...state.page.queries[tableType],
            activePage,
          },
        },
      },
    }))
    .case(updateTableLimit, (state, { limit, tableType }) => ({
      ...state,
      page: {
        ...state.page,
        queries: {
          ...state.page.queries,
          [tableType]: {
            ...state.page.queries[tableType],
            limit,
          },
        },
      },
    }))
    .case(updateTableSorting, (state, { sort, tableType }) => ({
      ...state,
      page: {
        ...state.page,
        queries: {
          ...state.page.queries,
          [tableType]: {
            ...state.page.queries[tableType],
            sort,
            activePage: DEFAULT_TABLE_ACTIVE_PAGE,
          },
        },
      },
    }))
    .case(updateUserRiskScoreSeverityFilter, (state, { severitySelection }) => ({
      ...state,
      page: {
        ...state.page,
        queries: {
          ...state.page.queries,
          [UsersTableType.risk]: {
            ...state.page.queries[UsersTableType.risk],
            severitySelection,
            activePage: DEFAULT_TABLE_ACTIVE_PAGE,
          },
        },
      },
    }))
    .case(updateUsersAnomaliesJobIdFilter, (state, { jobIds, usersType }) => {
      if (usersType === 'page') {
        return set('page.queries.anomalies.jobIdSelection', jobIds, state);
      } else {
        return set('details.queries.anomalies.jobIdSelection', jobIds, state);
      }
    })
    .case(updateUsersAnomaliesInterval, (state, { interval, usersType }) => {
      if (usersType === 'page') {
        return set('page.queries.anomalies.intervalSelection', interval, state);
      } else {
        return set('details.queries.anomalies.intervalSelection', interval, state);
      }
    })
    .case(addUserAssetTableField, (state, { fieldName, tableId }) => ({
      ...state,
      flyout: {
        ...state.flyout,
        queries: addAssetTableField({
          fieldName,
          tableId,
          tableById: state.flyout.queries,
        }),
      },
    }))
    .case(removeUserAssetTableField, (state, { fieldName, tableId }) => ({
      ...state,
      flyout: {
        ...state.flyout,
        queries: removeAssetTableField({
          tableId,
          fieldName,
          tableById: state.flyout.queries,
        }),
      },
    }))
    .build();
