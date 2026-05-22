/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AuthStackByField } from '../../../../../common/api/search_strategy/users/authentications';
import { PageScope } from '../../../../data_view_manager/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { AuthenticationsUserTable } from '../../../components/authentication/authentications_user_table';
import { histogramConfigs } from '../../../components/authentication/helpers';
import type { AuthenticationsUserTableProps } from '../../../components/authentication/types';
import { MatrixHistogram } from '../../../../common/components/matrix_histogram';

export const ID = 'usersAuthenticationsQuery';

const HISTOGRAM_QUERY_ID = 'usersAuthenticationsHistogramQuery';

export const AuthenticationsQueryTabBody = ({
  endDate,
  filterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
  deleteQuery,
  userName,
}: AuthenticationsUserTableProps) => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const histogramFilterQuery = useMemo(() => {
    const existsClause = {
      exists: { field: userName ? AuthStackByField.hostName : AuthStackByField.userName },
    };
    if (!filterQuery) {
      return JSON.stringify(existsClause);
    }
    try {
      const parsed = typeof filterQuery === 'string' ? JSON.parse(filterQuery) : filterQuery;
      return JSON.stringify({ bool: { filter: [parsed, existsClause] } });
    } catch {
      return JSON.stringify(existsClause);
    }
  }, [filterQuery, userName]);

  return (
    <>
      <MatrixHistogram
        endDate={endDate}
        filterQuery={histogramFilterQuery}
        id={HISTOGRAM_QUERY_ID}
        startDate={startDate}
        {...histogramConfigs}
        applyPageAndTabsFilters={false}
        sourcererScopeId={newDataViewPickerEnabled ? PageScope.explore : PageScope.default}
      />

      <AuthenticationsUserTable
        endDate={endDate}
        filterQuery={filterQuery}
        indexNames={indexNames}
        setQuery={setQuery}
        deleteQuery={deleteQuery}
        startDate={startDate}
        type={type}
        skip={skip}
        userName={userName}
      />
    </>
  );
};

AuthenticationsQueryTabBody.displayName = 'AllUsersQueryTabBody';
