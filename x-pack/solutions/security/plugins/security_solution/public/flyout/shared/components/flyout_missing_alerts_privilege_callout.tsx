/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../common/lib/kibana';

export interface FlyoutMissingAlertsPrivilegeCalloutProps {
  /**
   * Optional data-test-subj for testing
   */
  'data-test-subj'?: string;
}

/**
 * Callout shown when the user lacks the Alerts feature (securitySolutionAlertsV1) read privilege,
 * e.g. in the document details flyout left panel for related/correlated alerts tables.
 * Links to detections privilege documentation in the same manner as FlyoutMissingAlertsPrivilege.
 */
export const FlyoutMissingAlertsPrivilegeCallout: React.VFC<
  FlyoutMissingAlertsPrivilegeCalloutProps
> = ({ 'data-test-subj': dataTestSubj }) => {
  const { docLinks } = useKibana().services;
  const detectionsPrivilegesUrl = docLinks.links.siem.detectionsReq;

  return (
    <EuiCallOut
      iconType="lock"
      color="warning"
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.shared.missingAlertsPrivilegeCalloutTitle"
          defaultMessage="Privileges required"
        />
      }
      data-test-subj={dataTestSubj}
    >
      <p>
        <FormattedMessage
          id="xpack.securitySolution.flyout.shared.missingAlertsPrivilegeCalloutDescription"
          defaultMessage="To view related alerts, you need the Alerts feature read privilege. Contact your Kibana administrator to request access."
        />
      </p>
      <EuiLink href={detectionsPrivilegesUrl} target="_blank" external>
        <FormattedMessage
          id="xpack.securitySolution.flyout.shared.missingAlertsPrivilegeCalloutDocLink"
          defaultMessage="View documentation"
        />
      </EuiLink>
    </EuiCallOut>
  );
};

FlyoutMissingAlertsPrivilegeCallout.displayName = 'FlyoutMissingAlertsPrivilegeCallout';
