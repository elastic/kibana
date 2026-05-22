/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useEndpointExceptionsCapability } from '../../../../exceptions/hooks/use_endpoint_exceptions_capability';
import { useHttp } from '../../../../common/lib/kibana';
import { ArtifactListPage } from '../../../components/artifact_list_page';
import { EndpointExceptionsForm } from './components/endpoint_exceptions_form';
import { EndpointExceptionsApiClient } from '../service/api_client';
import { ENDPOINT_EXCEPTIONS_SEARCHABLE_FIELDS } from '../constants';
import { ENDPOINT_EXCEPTIONS_PAGE_LABELS } from '../translations';
import { usePerPolicyOptIn } from '../hooks/use_per_policy_opt_in';

export const EndpointExceptions = memo(() => {
  const { canWriteEndpointExceptions: hasWritePrivilege } = useUserPrivileges().endpointPrivileges;

  const canCreateEndpointExceptions = useEndpointExceptionsCapability('crudEndpointExceptions');

  const http = useHttp();
  const endpointExceptionsApiClient = EndpointExceptionsApiClient.getInstance(http);

  const { perPolicyOptInCallout, perPolicyOptInModal, perPolicyOptInActionMenuItem } =
    usePerPolicyOptIn();

  return (
    <>
      {perPolicyOptInModal}
      <ArtifactListPage
        apiClient={endpointExceptionsApiClient}
        ArtifactFormComponent={EndpointExceptionsForm}
        labels={ENDPOINT_EXCEPTIONS_PAGE_LABELS}
        data-test-subj="endpointExceptionsListPage"
        searchableFields={ENDPOINT_EXCEPTIONS_SEARCHABLE_FIELDS}
        flyoutSize="l"
        // hide Create button before opt-in w/o global privilege, show after opt-in w/o global privilege
        allowCardCreateAction={canCreateEndpointExceptions}
        // allow showing these before opt-in w/o global privilege, so they will be greyed based on
        // all existing artifacts being global, therefore showing user the 'needs additional priv' hint
        allowCardEditAction={hasWritePrivilege}
        allowCardDeleteAction={hasWritePrivilege}
        callout={perPolicyOptInCallout}
        additionalActions={
          perPolicyOptInActionMenuItem ? [perPolicyOptInActionMenuItem] : undefined
        }
      />
    </>
  );
});

EndpointExceptions.displayName = 'EndpointExceptions';
