/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  getPolicyIdsFromArtifact,
  isArtifactGlobal,
} from '../../../../../common/endpoint/service/artifacts';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { ContextMenuItemNavByRouterProps } from '../../context_menu_with_router_support';
import { useArtifactAssignedPolicies } from '../hooks/use_artifact_assigned_policies';

export interface ArtifactViewPolicyAssignmentProps {
  item: ExceptionListItemSchema;
  labels: {
    viewFlyoutPolicyAssignmentGlobalLabel: string;
    viewFlyoutPolicyAssignmentNoneLabel: string;
  };
  'data-test-subj'?: string;
}

export const ArtifactViewPolicyAssignment = memo<ArtifactViewPolicyAssignmentProps>(
  ({ item, labels, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    if (isArtifactGlobal(item)) {
      return (
        <EuiText size="s" data-test-subj={getTestId('global')}>
          {labels.viewFlyoutPolicyAssignmentGlobalLabel}
        </EuiText>
      );
    }

    return (
      <ArtifactViewAssignedPolicies item={item} labels={labels} data-test-subj={dataTestSubj} />
    );
  }
);
ArtifactViewPolicyAssignment.displayName = 'ArtifactViewPolicyAssignment';

const ArtifactViewAssignedPolicies = memo<ArtifactViewPolicyAssignmentProps>(
  ({ item, labels, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;
    const { policies } = useArtifactAssignedPolicies([item]);

    const policyIds = useMemo(() => getPolicyIdsFromArtifact(item), [item]);
    const policyNavLinks = useMemo<ContextMenuItemNavByRouterProps[]>(() => {
      return policyIds.map((id) => policies?.[id] ?? { children: id });
    }, [policies, policyIds]);

    if (policyNavLinks.length === 0) {
      return (
        <EuiText size="s" data-test-subj={getTestId('none')}>
          {labels.viewFlyoutPolicyAssignmentNoneLabel}
        </EuiText>
      );
    }

    return (
      <EuiText size="s" data-test-subj={getTestId('list')}>
        <ul>
          {policyNavLinks.map((policy, index) => {
            const policyId = policyIds[index];
            const isClickable = Boolean(canReadPolicyManagement && policy.href);
            const policyTestSubj = getTestId(`policy-${policyId}`);

            return (
              <li key={policyId}>
                {isClickable ? (
                  <EuiLink
                    href={policy.href}
                    target={policy.target}
                    data-test-subj={policyTestSubj}
                  >
                    {policy.children}
                  </EuiLink>
                ) : (
                  <span data-test-subj={policyTestSubj}>{policy.children}</span>
                )}
              </li>
            );
          })}
        </ul>
      </EuiText>
    );
  }
);
ArtifactViewAssignedPolicies.displayName = 'ArtifactViewAssignedPolicies';
