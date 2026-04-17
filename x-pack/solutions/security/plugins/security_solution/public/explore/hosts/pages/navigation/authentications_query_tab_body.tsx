/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { MatrixHistogram } from '../../../../common/components/matrix_histogram';
import { AuthenticationsHostTable } from '../../../components/authentication/authentications_host_table';
import { histogramConfigs } from '../../../components/authentication/helpers';
import type { HostsComponentsQueryProps } from './types';

const HISTOGRAM_QUERY_ID = 'authenticationsHistogramQuery';

const AuthenticationsQueryTabBodyComponent: React.FC<HostsComponentsQueryProps> = ({
  deleteQuery,
  endDate,
  filterQuery,
  identityScopedFilterQuery,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
}) => {
  const effectiveFilterQuery = identityScopedFilterQuery ?? filterQuery;

  return (
    <>
      <MatrixHistogram
        endDate={endDate}
        filterQuery={effectiveFilterQuery}
        id={HISTOGRAM_QUERY_ID}
        startDate={startDate}
        {...histogramConfigs}
      />

      <AuthenticationsHostTable
        endDate={endDate}
        filterQuery={effectiveFilterQuery}
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
