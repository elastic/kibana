/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiCallOut,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { PolicySelectorProps } from '../policy_selector';
import { PolicySelector } from '../policy_selector';
import { useArtifactRestrictedPolicyAssignments } from '../../hooks/artifacts/use_artifact_restricted_policy_assignments';
import { useGetUpdatedTags } from '../../hooks/artifacts';
import { useLicense } from '../../../common/hooks/use_license';
import {
  ARTIFACT_POLICIES_NOT_ACCESSIBLE_IN_ACTIVE_SPACE_MESSAGE,
  NO_PRIVILEGE_FOR_MANAGEMENT_OF_GLOBAL_ARTIFACT_MESSAGE,
} from '../../common/translations';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { PolicyData } from '../../../../common/endpoint/types';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import {
  getPolicyIdsFromArtifact,
  GLOBAL_ARTIFACT_TAG,
  isArtifactGlobal,
} from '../../../../common/endpoint/service/artifacts';
import { buildPerPolicyTag } from '../../../../common/endpoint/service/artifacts/utils';

const StyledEuiFlexItemButtonGroup = styled(EuiFlexItem)`
  @media only screen and (max-width: ${({ theme }) => theme.euiTheme.breakpoint.m}) {
    align-items: center;
  }
`;

const StyledButtonGroup = styled(EuiButtonGroup)`
  display: flex;
  justify-content: right;
  .euiButtonGroupButton {
    padding-right: ${({ theme }) => theme.euiTheme.size.l};
  }
`;

const EffectivePolicyFormContainer = styled.div`
  .policy-name .euiSelectableListItem__text {
    text-decoration: none !important;
    color: ${({ theme }) => theme.euiTheme.colors.textParagraph} !important;
  }
`;

export interface EffectedPolicySelection {
  isGlobal: boolean;
  selected: PolicyData[];
}

export interface EffectedPolicySelectProps {
  item: ExceptionListItemSchema | CreateExceptionListItemSchema;
  description?: string;
  onChange: (updatedItem: ExceptionListItemSchema | CreateExceptionListItemSchema) => void;
  disabled?: boolean;
  'data-test-subj'?: string;
}

/**
 * Policy Selection component used on Endpoint Artifact forms for setting Global/Per-Policy assignment.
 */
export const EffectedPolicySelect = memo<EffectedPolicySelectProps>(
  ({ item, description, onChange, disabled = false, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isSpaceAwarenessEnabled = useIsExperimentalFeatureEnabled(
      'endpointManagementSpaceAwarenessEnabled'
    );
    const canManageGlobalArtifacts =
      useUserPrivileges().endpointPrivileges.canManageGlobalArtifacts;
    const { getTagsUpdatedBy } = useGetUpdatedTags(item);
    const artifactRestrictedPolicyIds = useArtifactRestrictedPolicyAssignments(item);
    const [selectedPolicyIds, setSelectedPolicyIds] = useState(getPolicyIdsFromArtifact(item));

    const accessiblePolicyIds = useMemo(() => {
      return selectedPolicyIds.filter(
        (policyId) => !artifactRestrictedPolicyIds.policyIds.includes(policyId)
      );
    }, [artifactRestrictedPolicyIds.policyIds, selectedPolicyIds]);
    const isGlobal = useMemo(() => isArtifactGlobal(item), [item]);
    const selectedAssignmentType = useMemo(() => {
      if (isSpaceAwarenessEnabled) {
        return canManageGlobalArtifacts && isGlobal ? 'globalPolicy' : 'perPolicy';
      }

      return isGlobal ? 'globalPolicy' : 'perPolicy';
    }, [canManageGlobalArtifacts, isGlobal, isSpaceAwarenessEnabled]);

    const toggleGlobal: EuiButtonGroupOptionProps[] = useMemo(() => {
      const isGlobalButtonDisabled = !isSpaceAwarenessEnabled ? false : !canManageGlobalArtifacts;

      return [
        {
          id: 'globalPolicy',
          label: i18n.translate('xpack.securitySolution.endpoint.effectedPolicySelect.global', {
            defaultMessage: 'Global',
          }),
          iconType: selectedAssignmentType === 'globalPolicy' ? 'checkInCircleFilled' : 'empty',
          'data-test-subj': getTestId('global'),
          isDisabled: isGlobalButtonDisabled,
          toolTipContent: isGlobalButtonDisabled
            ? NO_PRIVILEGE_FOR_MANAGEMENT_OF_GLOBAL_ARTIFACT_MESSAGE
            : undefined,
        },
        {
          id: 'perPolicy',
          label: i18n.translate('xpack.securitySolution.endpoint.effectedPolicySelect.perPolicy', {
            defaultMessage: 'Per Policy',
          }),
          iconType: selectedAssignmentType === 'perPolicy' ? 'checkInCircleFilled' : 'empty',
          'data-test-subj': getTestId('perPolicy'),
        },
      ];
    }, [canManageGlobalArtifacts, getTestId, isSpaceAwarenessEnabled, selectedAssignmentType]);

    const unAccessiblePolicies: PolicySelectorProps['additionalListItems'] = useMemo(() => {
      const additionalPolicyItems: PolicySelectorProps['additionalListItems'] = [];

      if (artifactRestrictedPolicyIds.policyIds.length > 0) {
        additionalPolicyItems.push({
          label: i18n.translate(
            'xpack.securitySolution.effectedPolicySelect.unaccessibleGroupLabel',
            { defaultMessage: 'Assigned policies not accessible from current space' }
          ),
          isGroupLabel: true,
        });
      }

      for (const policyId of artifactRestrictedPolicyIds.policyIds) {
        additionalPolicyItems.push({
          label: policyId,
          toolTipContent: i18n.translate(
            'xpack.securitySolution.effectedPolicySelect.unaccessiblePolicyTooltip',
            { defaultMessage: 'Policy is not accessible from the current space' }
          ),
          disabled: true,
          checked: 'on',
        });
      }

      return additionalPolicyItems;
    }, [artifactRestrictedPolicyIds.policyIds]);

    const handleOnPolicySelectChange = useCallback<PolicySelectorProps['onChange']>(
      (updatedSelectedPolicyIds) => {
        const artifactCompleteSelectedPolicyIds = updatedSelectedPolicyIds.concat(
          ...artifactRestrictedPolicyIds.policyIds
        );

        setSelectedPolicyIds(artifactCompleteSelectedPolicyIds);
        onChange({
          ...item,
          tags: getTagsUpdatedBy(
            'policySelection',
            artifactCompleteSelectedPolicyIds.map(buildPerPolicyTag)
          ),
        });
      },
      [artifactRestrictedPolicyIds.policyIds, getTagsUpdatedBy, item, onChange]
    );

    const handleGlobalButtonChange = useCallback(
      (selectedId: string) => {
        onChange({
          ...item,
          tags: getTagsUpdatedBy(
            'policySelection',
            selectedId === 'globalPolicy'
              ? [GLOBAL_ARTIFACT_TAG]
              : selectedPolicyIds
                  .concat(artifactRestrictedPolicyIds.policyIds)
                  .map(buildPerPolicyTag)
          ),
        });
      },
      [artifactRestrictedPolicyIds.policyIds, getTagsUpdatedBy, item, onChange, selectedPolicyIds]
    );

    return (
      <EffectivePolicyFormContainer data-test-subj={getTestId()}>
        <EuiText size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.effectedPolicySelect.assignmentSectionTitle"
              defaultMessage="Assignment"
            />
          </h3>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiFlexGroup>
          <EuiFlexItem grow={2}>
            <EuiText size="s" data-test-subj={getTestId('description')}>
              <p>
                {description
                  ? description
                  : i18n.translate(
                      'xpack.securitySolution.effectedPolicySelect.assignmentSectionDescription',
                      {
                        defaultMessage:
                          'Assign globally across all policies, or assign it to specific policies.',
                      }
                    )}
              </p>
            </EuiText>
          </EuiFlexItem>
          <StyledEuiFlexItemButtonGroup grow={1}>
            <EuiFormRow fullWidth isDisabled={disabled}>
              <StyledButtonGroup
                legend="Global Policy Toggle"
                options={toggleGlobal}
                idSelected={selectedAssignmentType}
                onChange={handleGlobalButtonChange}
                color="primary"
                data-test-subj={getTestId('byPolicyGlobalButtonGroup')}
                isDisabled={disabled}
              />
            </EuiFormRow>
          </StyledEuiFlexItemButtonGroup>
        </EuiFlexGroup>
        <EuiSpacer />

        {selectedAssignmentType === 'perPolicy' && (
          <EuiFormRow fullWidth>
            <PolicySelector
              selectedPolicyIds={accessiblePolicyIds}
              additionalListItems={unAccessiblePolicies}
              onChange={handleOnPolicySelectChange}
              data-test-subj={getTestId('policiesSelector')}
              useCheckbox={true}
              showPolicyLink={true}
              isDisabled={isGlobal || !isPlatinumPlus || disabled}
            />
          </EuiFormRow>
        )}

        {artifactRestrictedPolicyIds.policyIds.length > 0 && !isGlobal && (
          <>
            <EuiSpacer />
            <EuiCallOut size="s" data-test-subj={getTestId('unAccessiblePoliciesCallout')}>
              {ARTIFACT_POLICIES_NOT_ACCESSIBLE_IN_ACTIVE_SPACE_MESSAGE(
                artifactRestrictedPolicyIds.policyIds.length
              )}
            </EuiCallOut>
          </>
        )}
      </EffectivePolicyFormContainer>
    );
  }
);

EffectedPolicySelect.displayName = 'EffectedPolicySelectNew';
