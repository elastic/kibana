/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RESPONSE_ACTIONS_HISTORY } from '../../../../app/translations';
import { useKibana } from '../../../../common/lib/kibana';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { ResponseActionsLog } from '../../../components/endpoint_response_actions_list/response_actions_log';

export const ResponseActionsListPage = () => {
  const { docLinks } = useKibana().services;

  return (
    <AdministrationListPage
      data-test-subj="responseActionsPage"
      title={RESPONSE_ACTIONS_HISTORY}
      docLink={docLinks.links.securitySolution.responseActionsHistory}
    >
      <ResponseActionsLog showHostNames={true} isFlyout={false} />
    </AdministrationListPage>
  );
};

ResponseActionsListPage.displayName = 'ResponseActionsListPage';
