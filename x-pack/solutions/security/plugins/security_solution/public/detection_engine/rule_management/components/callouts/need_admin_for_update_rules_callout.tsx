/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CallOutMessage } from '../../../../common/components/callouts';
import { CallOutPersistentSwitcher } from '../../../../common/components/callouts';
import { useUserData } from '../../../../detections/components/user_info';
import {
  DetectionsRequirementsLink,
  SecuritySolutionRequirementsLink,
} from '../../../../common/components/links_to_docs';

export const NEED_ADMIN_CALLOUT_TEST_ID = 'need-admin-for-update-rules';

const NEED_ADMIN_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.alertsPage.needAdminForUpdateCallOutBody.messageTitle',
  {
    defaultMessage: 'Administration permissions required for alert migration',
  }
);

const needAdminForUpdateRulesMessage: CallOutMessage = {
  type: 'primary',
  id: NEED_ADMIN_CALLOUT_TEST_ID,
  title: NEED_ADMIN_CALLOUT_TITLE,
  description: (
    <FormattedMessage
      id="xpack.securitySolution.alertsPage.needAdminForUpdateCallOutBody.messageBody.messageDetail"
      defaultMessage="{essence} Related documentation: {docs}"
      values={{
        essence: (
          <p>
            <FormattedMessage
              id="xpack.securitySolution.alertsPage.needAdminForUpdateCallOutBody.messageBody.essenceDescription"
              defaultMessage="You are currently missing the required permissions to auto migrate your alert data. Please have your administrator visit this page one time to auto migrate your alert data."
            />
          </p>
        ),
        docs: (
          <ul>
            <li>
              <DetectionsRequirementsLink />
            </li>
            <li>
              <SecuritySolutionRequirementsLink />
            </li>
          </ul>
        ),
      }}
    />
  ),
};

/**
 * Callout component that lets the user know that an administrator is needed for performing
 * and auto-update of signals or not. For this component to render the user must:
 * - Have the permissions to be able to read "signalIndexMappingOutdated" and that condition is "true"
 * - Have the permissions to be able to read "hasIndexManage" and that condition is "false"
 *
 * Some users do not have sufficient privileges to be able to determine if "signalIndexMappingOutdated"
 * is outdated or not. Same could apply to "hasIndexManage". When users do not have enough permissions
 * to determine if "signalIndexMappingOutdated" is true or false, the permissions system returns a "null"
 * instead.
 *
 * If the user has the permissions to see that signalIndexMappingOutdated is true and that
 * hasIndexManage is also true, then the user should be performing the update on the page which is
 * why we do not show it for that condition.
 */
export const NeedAdminForUpdateRulesCallOut = memo(() => {
  const [{ signalIndexMappingOutdated, hasIndexManage }] = useUserData();

  const shouldShowCallout = useMemo(
    () =>
      signalIndexMappingOutdated != null &&
      signalIndexMappingOutdated &&
      hasIndexManage != null &&
      !hasIndexManage,
    [hasIndexManage, signalIndexMappingOutdated]
  );

  return (
    shouldShowCallout && (
      <>
        <CallOutPersistentSwitcher condition={true} message={needAdminForUpdateRulesMessage} />
        <EuiSpacer size="l" />
      </>
    )
  );
});

NeedAdminForUpdateRulesCallOut.displayName = 'NeedAdminForUpdateRulesCallOut';
