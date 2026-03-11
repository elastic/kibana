/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexItem, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../common/lib/kibana';
import { FLYOUT_MISSING_ALERTS_PRIVILEGE_TEST_ID } from './test_ids';

/**
 * Shown in the alert flyout when the user lacks the Alerts feature (securitySolutionAlertsV1) read privilege
 */
export const FlyoutMissingAlertsPrivilege: React.VFC = () => {
  const { docLinks } = useKibana().services;
  const detectionsPrivilegesUrl = docLinks.links.siem.detectionsReq;

  return (
    <EuiFlexItem>
      <EuiEmptyPrompt
        iconType="lock"
        color="subdued"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.flyout.shared.missingAlertsPrivilegeTitle"
              defaultMessage="Privileges required"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.securitySolution.flyout.shared.missingAlertsPrivilegeDescription"
              defaultMessage="To view alert details, you need the Alerts feature read privilege. Contact your Kibana administrator to request access."
            />
          </p>
        }
        actions={
          <EuiLink href={detectionsPrivilegesUrl} target="_blank" external>
            <FormattedMessage
              id="xpack.securitySolution.flyout.shared.missingAlertsPrivilegeDocLink"
              defaultMessage="View documentation"
            />
          </EuiLink>
        }
        data-test-subj={FLYOUT_MISSING_ALERTS_PRIVILEGE_TEST_ID}
      />
    </EuiFlexItem>
  );
};

FlyoutMissingAlertsPrivilege.displayName = 'FlyoutMissingAlertsPrivilege';
