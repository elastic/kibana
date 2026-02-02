/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useHttp } from '../../../../common/lib/kibana';
import { ArtifactListPage } from '../../../components/artifact_list_page';
import { EndpointExceptionsForm } from './components/endpoint_exceptions_form';
import { EndpointExceptionsApiClient } from '../service/api_client';
import { ENDPOINT_EXCEPTIONS_SEARCHABLE_FIELDS } from '../constants';
import { ENDPOINT_EXCEPTIONS_PAGE_LABELS } from '../translations';

export const EndpointExceptions = memo(() => {
  const { canWriteEndpointExceptions } = useUserPrivileges().endpointPrivileges;
  const http = useHttp();
  const endpointExceptionsApiClient = EndpointExceptionsApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={endpointExceptionsApiClient}
      ArtifactFormComponent={EndpointExceptionsForm}
      labels={ENDPOINT_EXCEPTIONS_PAGE_LABELS}
      data-test-subj="endpointExceptionsListPage"
      searchableFields={ENDPOINT_EXCEPTIONS_SEARCHABLE_FIELDS}
      flyoutSize="l"
      allowCardCreateAction={canWriteEndpointExceptions}
      allowCardEditAction={canWriteEndpointExceptions}
      allowCardDeleteAction={canWriteEndpointExceptions}
    />
  );
});

EndpointExceptions.displayName = 'EndpointExceptions';
