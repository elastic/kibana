/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CUSTOM_YARA_SIGNATURES_PAGE_LABELS } from '../translations';
import { ArtifactListPage } from '../../../components/artifact_list_page';
import { CustomYaraSignaturesApiClient } from '../service/api_client';
import { HostIsolationExceptionsForm } from '../../host_isolation_exceptions/view/components/form';
import { useHttp } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { SEARCHABLE_FIELDS } from '../constants';

export const CustomYaraSignaturesList = memo(() => {
  const http = useHttp();
  const isCustomYaraSignaturesEnabled = useIsExperimentalFeatureEnabled(
    'customYaraSignaturesEnabled'
  );

  const { canWriteCustomYaraSignatures } = useUserPrivileges().endpointPrivileges;

  if (!isCustomYaraSignaturesEnabled) {
    return null;
  }

  const customYaraSignaturesApiClient = CustomYaraSignaturesApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={customYaraSignaturesApiClient}
      // Placeholder until a Custom YARA form exists; create/edit will not produce valid items.
      ArtifactFormComponent={HostIsolationExceptionsForm}
      labels={CUSTOM_YARA_SIGNATURES_PAGE_LABELS}
      data-test-subj="customYaraSignaturesList"
      searchableFields={SEARCHABLE_FIELDS}
      allowCardDeleteAction={canWriteCustomYaraSignatures}
      allowCardEditAction={canWriteCustomYaraSignatures}
      allowCardCreateAction={canWriteCustomYaraSignatures}
    />
  );
});

CustomYaraSignaturesList.displayName = 'CustomYaraSignaturesList';
