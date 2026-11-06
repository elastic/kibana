/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import hash from 'object-hash';
import React, { memo, useMemo } from 'react';

import type { CallOutMessage } from '../../../common/components/callouts';
import { CallOutPersistentSwitcher } from '../../../common/components/callouts';
import type { MissingPrivileges } from '../../../common/hooks/use_missing_privileges';
import * as i18n from './translations';

const WORKFLOWS_PRIVILEGE_EXPLANATIONS: Record<string, string> = {
  execute: i18n.CANNOT_GENERATE_ATTACK_DISCOVERIES,
  read: i18n.CANNOT_MONITOR_ATTACK_DISCOVERIES,
};

const getWorkflowsExplanation = (privileges: string[]): string =>
  privileges
    .map((privilege) => WORKFLOWS_PRIVILEGE_EXPLANATIONS[privilege])
    .filter(Boolean)
    .join(' ');

const missingFeaturePrivileges = (feature: string, privileges: string[]) => (
  <FormattedMessage
    id="xpack.securitySolution.attackDiscovery.workflowsMissingPrivilegesCallOut.missingFeaturePrivileges"
    defaultMessage="Missing {privileges} privileges for the {feature} feature. {explanation}"
    values={{
      privileges: <EuiCode>{privileges.join(', ')}</EuiCode>,
      feature: <EuiCode>{feature}</EuiCode>,
      explanation: getWorkflowsExplanation(privileges),
    }}
  />
);

const workflowsMissingPrivilegesBody = ({ featurePrivileges }: MissingPrivileges) => (
  <>
    <p>{i18n.ESSENCE}</p>
    {i18n.FEATURE_PRIVILEGES_TITLE}
    <ul>
      {featurePrivileges.map(([feature, privileges]) => (
        <li key={feature}>{missingFeaturePrivileges(feature, privileges)}</li>
      ))}
    </ul>
  </>
);

export interface WorkflowsMissingPrivilegesCallOutProps {
  missingPrivileges: MissingPrivileges;
}

/**
 * A non-dismissible callout that lists the missing `workflowsManagement`
 * privileges required by Attack Discovery 2.0 surfaces, with explanations
 * of what the user cannot do without them.
 */
export const WorkflowsMissingPrivilegesCallOut = memo<WorkflowsMissingPrivilegesCallOutProps>(
  ({ missingPrivileges }) => {
    const message: CallOutMessage | null = useMemo(() => {
      const hasMissingPrivileges =
        missingPrivileges.indexPrivileges.length > 0 ||
        missingPrivileges.featurePrivileges.length > 0;

      if (!hasMissingPrivileges) {
        return null;
      }

      return {
        type: 'primary',
        id: `attack-discovery-workflows-missing-privileges-${hash(missingPrivileges)}`,
        title: i18n.MISSING_PRIVILEGES_CALLOUT_TITLE,
        description: workflowsMissingPrivilegesBody(missingPrivileges),
      };
    }, [missingPrivileges]);

    if (message == null) {
      return null;
    }

    return <CallOutPersistentSwitcher condition={true} message={message} />;
  }
);

WorkflowsMissingPrivilegesCallOut.displayName = 'WorkflowsMissingPrivilegesCallOut';
