/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  getPolicyIdsFromArtifact,
  isArtifactGlobal,
} from '../../../../../common/endpoint/service/artifacts';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { WithContextMenu } from '../../artifact_entry_card/components/effect_scope';
import type { MenuItemPropsByPolicyId } from '../../artifact_entry_card';
import type { ContextMenuItemNavByRouterProps } from '../../context_menu_with_router_support';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { artifactListPageLabels } from '../translations';

export interface PolicyAssignmentCellProps {
  item: ExceptionListItemSchema;
  policies?: MenuItemPropsByPolicyId;
  loadingPoliciesList?: boolean;
  labels: typeof artifactListPageLabels;
  'data-test-subj'?: string;
}

export const PolicyAssignmentCell = memo<PolicyAssignmentCellProps>(
  ({ item, policies, loadingPoliciesList = false, labels, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    if (isArtifactGlobal(item)) {
      return (
        <EuiText size="s" data-test-subj={getTestId('global')}>
          {labels.tablePolicyAssignmentGlobalLabel}
        </EuiText>
      );
    }

    return (
      <PolicyAssignmentCellWithAssignedPolicies
        item={item}
        policies={policies}
        loadingPoliciesList={loadingPoliciesList}
        labels={labels}
        data-test-subj={dataTestSubj}
      />
    );
  }
);
PolicyAssignmentCell.displayName = 'PolicyAssignmentCell';

export const PolicyAssignmentCellWithAssignedPolicies = memo<PolicyAssignmentCellProps>(
  ({ item, policies, loadingPoliciesList = false, labels, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;

    const policyNavLinks = useMemo<ContextMenuItemNavByRouterProps[]>(() => {
      return getPolicyIdsFromArtifact(item).map((id) => {
        return policies?.[id] ?? { children: id };
      });
    }, [item, policies]);

    const { firstPolicy, additionalPolicies } = useMemo<{
      firstPolicy: ContextMenuItemNavByRouterProps | undefined;
      additionalPolicies: ContextMenuItemNavByRouterProps[];
    }>(() => {
      return {
        firstPolicy: policyNavLinks[0],
        additionalPolicies: policyNavLinks.slice(1),
      };
    }, [policyNavLinks]);

    if (firstPolicy === undefined) {
      return (
        <EuiText size="s" data-test-subj={getTestId('none')}>
          {labels.tablePolicyAssignmentNoneLabel}
        </EuiText>
      );
    }

    const additionalCount = additionalPolicies.length;
    const isFirstPolicyClickable = Boolean(canReadPolicyManagement && firstPolicy.href);

    return (
      <EuiFlexGroup
        responsive={false}
        gutterSize="s"
        alignItems="center"
        wrap={false}
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false} className="eui-textTruncate">
          <EuiToolTip content={firstPolicy.children} anchorClassName="eui-textTruncate">
            {isFirstPolicyClickable ? (
              <EuiLink
                href={firstPolicy.href}
                target={firstPolicy.target}
                className="eui-textTruncate"
                data-test-subj={getTestId('firstPolicy')}
              >
                {firstPolicy.children}
              </EuiLink>
            ) : (
              <EuiText
                size="s"
                className="eui-textTruncate"
                tabIndex={0}
                data-test-subj={getTestId('firstPolicy')}
              >
                {firstPolicy.children}
              </EuiText>
            )}
          </EuiToolTip>
        </EuiFlexItem>

        {additionalCount > 0 && (
          <EuiFlexItem grow={false}>
            <WithContextMenu
              policies={additionalPolicies}
              loadingPoliciesList={loadingPoliciesList}
              canReadPolicies={canReadPolicyManagement}
              data-test-subj={getTestId('popupMenu')}
            >
              <EuiBadge
                color="hollow"
                onClick={() => undefined}
                onClickAriaLabel={labels.getTablePolicyAssignmentAdditionalCountAriaLabel(
                  additionalCount
                )}
                data-test-subj={getTestId('additionalCount')}
              >
                {labels.getTablePolicyAssignmentAdditionalCountLabel(additionalCount)}
              </EuiBadge>
            </WithContextMenu>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
PolicyAssignmentCellWithAssignedPolicies.displayName = 'PolicyAssignmentCellWithAssignedPolicies';
