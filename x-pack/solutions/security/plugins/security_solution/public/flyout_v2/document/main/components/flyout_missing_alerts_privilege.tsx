/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DocLinks } from '@kbn/doc-links';
import { i18n } from '@kbn/i18n';
import { FLYOUT_MISSING_ALERTS_PRIVILEGE_TEST_ID } from './test_ids';
import { NoPrivileges } from '../../../../common/components/no_privileges';

const alertDetailsPageName = i18n.translate(
  'xpack.securitySolution.flyout.document.alertDetailsPageName',
  {
    defaultMessage: 'Alert details',
  }
);
const docLinkSelector = (links: DocLinks) => links.siem.detectionsReq;

/**
 * Shown in the alert flyout when the user lacks the Alerts feature (securitySolutionAlertsV1) read privilege
 */
export const FlyoutMissingAlertsPrivilege = memo(() => (
  <NoPrivileges
    pageName={alertDetailsPageName}
    docLinkSelector={docLinkSelector}
    data-test-subj={FLYOUT_MISSING_ALERTS_PRIVILEGE_TEST_ID}
  />
));

FlyoutMissingAlertsPrivilege.displayName = 'FlyoutMissingAlertsPrivilege';
