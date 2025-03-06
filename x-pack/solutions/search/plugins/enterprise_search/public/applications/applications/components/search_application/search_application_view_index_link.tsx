/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useValues } from 'kea';

import { EuiLink } from '@elastic/eui';

import { KibanaLogic } from '../../../shared/kibana';

export const SearchApplicationViewIndexLink: React.FC<{
  indexName: string;
  dataTestSubj?: string;
  dataTelemetryId?: string;
}> = ({ indexName, dataTestSubj, dataTelemetryId }) => {
  const { share } = useValues(KibanaLogic);

  const searchIndexDetailsUrl: string =
    share?.url.locators.get('SEARCH_INDEX_DETAILS_LOCATOR_ID')?.useUrl({ indexName }) ?? '';

  return searchIndexDetailsUrl ? (
    <EuiLink
      data-telemetry-id={dataTelemetryId}
      data-test-subj={dataTestSubj}
      href={searchIndexDetailsUrl}
    >
      {indexName}
    </EuiLink>
  ) : (
    <>{indexName}</>
  );
};
