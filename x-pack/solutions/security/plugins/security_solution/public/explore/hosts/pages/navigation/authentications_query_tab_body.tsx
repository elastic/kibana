/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { AuthStackByField } from '../../../../../common/api/search_strategy/users/authentications';
import { MatrixHistogram } from '../../../../common/components/matrix_histogram';
import { AuthenticationsHostTable } from '../../../components/authentication/authentications_host_table';
import { histogramConfigs } from '../../../components/authentication/helpers';
import type { HostsComponentsQueryProps } from './types';

const HISTOGRAM_QUERY_ID = 'authenticationsHistogramQuery';

const AuthenticationsQueryTabBodyComponent: React.FC<HostsComponentsQueryProps> = ({
  deleteQuery,
  endDate,
  filterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
}) => {
  const histogramFilterQuery = useMemo(() => {
    const existsClause = {
      exists: { field: AuthStackByField.userName },
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
  }, [filterQuery]);
  return (
    <>
      <MatrixHistogram
        endDate={endDate}
        filterQuery={histogramFilterQuery}
        id={HISTOGRAM_QUERY_ID}
        startDate={startDate}
        {...histogramConfigs}
        applyPageAndTabsFilters={false}
      />

      <AuthenticationsHostTable
        endDate={endDate}
        filterQuery={filterQuery}
        indexNames={indexNames}
        setQuery={setQuery}
        deleteQuery={deleteQuery}
        startDate={startDate}
        type={type}
        skip={skip}
      />
    </>
  );
};

AuthenticationsQueryTabBodyComponent.displayName = 'AuthenticationsQueryTabBodyComponent';

export const AuthenticationsQueryTabBody = React.memo(AuthenticationsQueryTabBodyComponent);

AuthenticationsQueryTabBody.displayName = 'AuthenticationsQueryTabBody';
