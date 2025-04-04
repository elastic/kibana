/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiButtonGroupOptionProps, EuiSelectableProps } from '@elastic/eui';
import {
  EuiCallOut,
  EuiButtonGroup,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
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
import { LinkToApp } from '../../../common/components/endpoint/link_to_app';
import { getPolicyDetailPath } from '../../common/routing';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useAppUrl } from '../../../common/lib/kibana/hooks';
import { Loader } from '../../../common/components/loader';
import {
  getPolicyIdsFromArtifact,
  GLOBAL_ARTIFACT_TAG,
  isArtifactGlobal,
} from '../../../../common/endpoint/service/artifacts';
import { buildPerPolicyTag } from '../../../../common/endpoint/service/artifacts/utils';

const NOOP = () => {};
const DEFAULT_LIST_PROPS: EuiSelectableProps['listProps'] = { bordered: true, showIcons: false };
const SEARCH_PROPS = { className: 'effected-policies-search' };

const StyledEuiSelectable = styled.div`
  .effected-policies-search {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .euiSelectableList {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    border-top-width: 0;
  }
`;

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

interface OptionPolicyData {
  policy: PolicyData;
}

type EffectedPolicyOption = EuiSelectableOption<OptionPolicyData>;

export interface EffectedPolicySelection {
  isGlobal: boolean;
  selected: PolicyData[];
}

export type EffectedPolicySelectProps = Omit<
  EuiSelectableProps<OptionPolicyData>,
  'onChange' | 'options' | 'children' | 'searchable'
> & {
  item: ExceptionListItemSchema | CreateExceptionListItemSchema;
  options: PolicyData[];
  description?: string;
  onChange: (updatedItem: ExceptionListItemSchema | CreateExceptionListItemSchema) => void;
  disabled?: boolean;
};

export const EffectedPolicySelect = memo<EffectedPolicySelectProps>(
  ({
    item,
    description,
    isLoading = false,
    onChange,
    listProps,
    options,
    disabled = false,
    'data-test-subj': dataTestSubj,
    ...otherSelectableProps
  }) => {
    const { getAppUrl } = useAppUrl();
    const { canReadPolicyManagement } = useUserPrivileges().endpointPrivileges;
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

    const selectableOptions: EffectedPolicyOption[] = useMemo(() => {
      const isPolicySelected = new Set<string>(selectedPolicyIds);

      return options
        .map<EffectedPolicyOption>((policy) => ({
          label: policy.name,
          className: 'policy-name',
          prepend: (
            <EuiCheckbox
              id={htmlIdGenerator()()}
              onChange={NOOP}
              checked={isPolicySelected.has(policy.id)}
              disabled={isGlobal || !isPlatinumPlus || disabled}
              data-test-subj={`policy-${policy.id}-checkbox`}
            />
          ),
          append: canReadPolicyManagement ? (
            <LinkToApp
              href={getAppUrl({ path: getPolicyDetailPath(policy.id) })}
              appPath={getPolicyDetailPath(policy.id)}
              target="_blank"
              data-test-subj={getTestId('policyLink')}
            >
              <FormattedMessage
                id="xpack.securitySolution.effectedPolicySelect.viewPolicyLinkLabel"
                defaultMessage="View policy"
              />
            </LinkToApp>
          ) : null,
          policy,
          checked: isPolicySelected.has(policy.id) ? 'on' : undefined,
          disabled: isGlobal || !isPlatinumPlus || disabled,
          'data-test-subj': `policy-${policy.id}`,
        }))
        .sort(({ label: labelA }, { label: labelB }) => labelA.localeCompare(labelB));
    }, [
      canReadPolicyManagement,
      disabled,
      getAppUrl,
      getTestId,
      isGlobal,
      isPlatinumPlus,
      options,
      selectedPolicyIds,
    ]);

    const handleOnPolicySelectChange = useCallback<
      Required<EuiSelectableProps<OptionPolicyData>>['onChange']
    >(
      (currentOptions) => {
        const newPolicyAssignmentTags: string[] =
          artifactRestrictedPolicyIds.policyIds.map(buildPerPolicyTag);
        const newPolicyIds: string[] = [];

        for (const opt of currentOptions) {
          if (opt.checked) {
            newPolicyIds.push(opt.policy.id);
            newPolicyAssignmentTags.push(buildPerPolicyTag(opt.policy.id));
          }
        }

        setSelectedPolicyIds(newPolicyIds);
        onChange({
          ...item,
          tags: getTagsUpdatedBy('policySelection', newPolicyAssignmentTags),
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

    const listBuilderCallback = useCallback<NonNullable<EuiSelectableProps['children']>>(
      (list, search) => {
        return (
          <>
            {search}
            {list}
          </>
        );
      },
      []
    );

    return (
      <EffectivePolicyFormContainer>
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
            <EuiText size="s">
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

        {selectedAssignmentType === 'perPolicy' &&
          (isLoading ? (
            <Loader size="l" data-test-subj={getTestId('policiesLoader')} />
          ) : (
            <EuiFormRow fullWidth>
              <StyledEuiSelectable>
                <EuiSelectable<OptionPolicyData>
                  {...otherSelectableProps}
                  options={selectableOptions}
                  listProps={listProps || DEFAULT_LIST_PROPS}
                  onChange={handleOnPolicySelectChange}
                  searchProps={SEARCH_PROPS}
                  searchable={true}
                  data-test-subj={getTestId('policiesSelectable')}
                >
                  {listBuilderCallback}
                </EuiSelectable>
              </StyledEuiSelectable>
            </EuiFormRow>
          ))}
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
