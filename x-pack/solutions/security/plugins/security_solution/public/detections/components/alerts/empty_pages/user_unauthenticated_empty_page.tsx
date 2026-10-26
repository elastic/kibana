/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { GO_TO_DOCUMENTATION } from './translations';
import { EmptyPage } from '../../../../common/components/empty_page';
import { useKibana } from '../../../../common/lib/kibana';

const USER_UNAUTHENTICATED_MSG_BODY = i18n.translate(
  'xpack.securitySolution.alertsPage.userUnauthenticatedMsgBody',
  {
    defaultMessage:
      'You do not have the required permissions for viewing the detection engine. For more help, contact your administrator.',
  }
);
const USER_UNAUTHENTICATED_TITLE = i18n.translate(
  'xpack.securitySolution.alertsPage.userUnauthenticatedTitle',
  {
    defaultMessage: 'Detection engine permissions required',
  }
);

export const USER_UNAUTHENTICATED_TEST_ID = 'alerts-page-user-unauthenticated';

/**
 * EmptyPage component displayed on the alerts page when the user is unauthenticated.
 * It provides a link to the documentation for detections requirements
 */
export const UserUnauthenticatedEmptyPage = React.memo(() => {
  const docLinks = useKibana().services.docLinks;
  const actions = useMemo(
    () => ({
      detectionUnauthenticated: {
        icon: 'documents',
        label: GO_TO_DOCUMENTATION,
        url: `${docLinks.links.siem.detectionsReq}`,
        target: '_blank',
      },
    }),
    [docLinks]
  );
  return (
    <EmptyPage
      actions={actions}
      message={USER_UNAUTHENTICATED_MSG_BODY}
      data-test-subj={USER_UNAUTHENTICATED_TEST_ID}
      title={USER_UNAUTHENTICATED_TITLE}
    />
  );
});

UserUnauthenticatedEmptyPage.displayName = 'UserUnauthenticatedEmtpyPage';
