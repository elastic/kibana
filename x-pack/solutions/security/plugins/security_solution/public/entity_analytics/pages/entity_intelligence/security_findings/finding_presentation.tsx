/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SecurityFinding } from './types';

export const severityLabels = {
  critical: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.critical',
    { defaultMessage: 'Critical' }
  ),
  high: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.high',
    { defaultMessage: 'High' }
  ),
  medium: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.medium',
    { defaultMessage: 'Medium' }
  ),
  low: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.securityFindings.low', {
    defaultMessage: 'Low',
  }),
};

export const activityLabel = (action: string): string => {
  switch (action) {
    case 'protected_file_access':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.protectedFileAccess',
        { defaultMessage: 'Protected file access' }
      );
    case 'unapproved_export':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.unapprovedExport',
        { defaultMessage: 'Unapproved export' }
      );
    case 'restricted_tool_use':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.restrictedToolUse',
        { defaultMessage: 'Restricted tool input' }
      );
    case 'privilege_change':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.privilegeChange',
        { defaultMessage: 'Privilege change' }
      );
    case 'suspicious_authentication':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.suspiciousAuthentication',
        { defaultMessage: 'Suspicious sign-in' }
      );
    case 'file_read':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.fileRead',
        { defaultMessage: 'Read file' }
      );
    default:
      return action;
  }
};

export const provenanceLabel = (provenance: string | undefined): string => {
  switch (provenance) {
    case 'local_os_account':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.localOsAccount',
        { defaultMessage: 'Local operating system account' }
      );
    case 'generated':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.generatedIdentity',
        { defaultMessage: 'Generated entity observation' }
      );
    case 'google_signed_id_token_verified_by_application':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.googleAdk.findingIdentitySource',
        { defaultMessage: 'Google ID token verified by the agent application' }
      );
    case 'authenticated_user':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.authenticatedIdentity',
        { defaultMessage: 'Authenticated account' }
      );
    case 'kibana_authc':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.kibanaIdentity',
        { defaultMessage: 'Kibana authentication' }
      );
    default:
      return (
        provenance ??
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.identitySourceUnknown',
          { defaultMessage: 'Not recorded' }
        )
      );
  }
};

export const outcomeLabel = (finding: SecurityFinding): string =>
  finding.outcome === 'blocked'
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.blocked',
        { defaultMessage: 'Blocked' }
      )
    : finding.kind === 'policy_violation'
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.violation',
        { defaultMessage: 'Policy violation' }
      )
    : finding.outcome === 'allowed'
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.allowed',
        { defaultMessage: 'Allowed' }
      )
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.detected',
        { defaultMessage: 'Detected' }
      );

export const nextStep = (finding: SecurityFinding): string =>
  finding.outcome === 'blocked'
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.blockedNextStep',
        {
          defaultMessage:
            'Review the initiating request and the enforcing policy. Check surrounding activity for retries or a different route to the same target.',
        }
      )
    : finding.kind === 'policy_violation'
    ? i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.violationNextStep',
        {
          defaultMessage:
            'Confirm the policy scope and inspect the source event to establish what executed. Review the affected identity’s access and related activity.',
        }
      )
    : i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.securityFindings.detectedNextStep',
        {
          defaultMessage:
            'Inspect the alert and its source events. Confirm the action, authorization and impact before deciding how to respond.',
        }
      );

export const FindingOutcome: React.FC<{ finding: SecurityFinding }> = ({ finding }) => (
  <EuiBadge
    color={
      finding.outcome === 'blocked'
        ? 'primary'
        : finding.kind === 'policy_violation'
        ? 'danger'
        : 'hollow'
    }
    iconType={finding.outcome === 'blocked' ? 'shield' : undefined}
  >
    {outcomeLabel(finding)}
  </EuiBadge>
);
