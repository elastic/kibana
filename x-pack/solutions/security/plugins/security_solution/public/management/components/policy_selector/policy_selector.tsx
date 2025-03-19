/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiSelectable,
  type EuiSelectableProps,
  type EuiSelectableOption,
  EuiCheckbox,
  htmlIdGenerator,
  EuiPanel,
  EuiPagination,
  EuiProgress,
} from '@elastic/eui';
import type { GetPackagePoliciesRequest, PackagePolicy } from '@kbn/fleet-plugin/common';
import { INTEGRATIONS_PLUGIN_ID, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import type { EuiPaginationProps } from '@elastic/eui/src/components/pagination/pagination';
import { i18n } from '@kbn/i18n';
import { APP_UI_ID } from '../../../../common';
import { useAppUrl } from '../../../common/lib/kibana';
import { LinkToApp } from '../../../common/components/endpoint';
import { useFetchIntegrationPolicyList } from '../../hooks/policy/use_fetch_integration_policy_list';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { getPolicyDetailPath } from '../../common/routing';
import { useUserPrivileges } from '../../../common/components/user_privileges';

const NOOP = () => {};
const DEFAULT_LIST_PROPS: EuiSelectableProps['listProps'] = Object.freeze({
  bordered: true,
  showIcons: false,
});
const SEARCH_PROPS = Object.freeze({ className: 'searchbar' });

const PolicySelectorContainer = styled.div`
  .selectable-container {
    position: relative;
  }

  .searchbar {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .policy-name .euiSelectableListItem__text {
    text-decoration: none !important;
    color: ${({ theme }) => theme.euiTheme.colors.textParagraph} !important;
  }
  .euiSelectableList {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    border-top-width: 0;
  }
`;

interface OptionPolicyData {
  policy: PackagePolicy;
}

type CustomPolicyDisplayOptions = Pick<
  EuiSelectableOption,
  'disabled' | 'toolTipContent' | 'toolTipProps'
>;

export interface PolicySelectorProps {
  /** The list of policy IDs that are currently selected */
  selectedPolicyIds: string[];
  /**
   * Any query options supported by the fleet api. The defaults applied will filter for only
   * Endpoint integration policies sorted by name.
   */
  queryOptions?: Pick<
    GetPackagePoliciesRequest['query'],
    'perPage' | 'kuery' | 'sortField' | 'sortOrder' | 'withAgentCount'
  >;
  /**
   * If `true`, then checkboxes will be used next to each item on the list as the selector component.
   * This is the likely choice when using this component in a Form (ex. Artifact create/update form)
   */
  useCheckbox?: boolean;
  /**
   * If `true`, each policy option on the list will have a `view details` link. The link will point
   * to the Security Solution policy details page if the policy is for elastic defend, and to the
   * fleet package policy details if not.
   */
  showPolicyLink?: boolean;
  /**
   * Callback for setting additional display properties for each policy displayed on the list. callback is provided
   * with the package policy from fleet
   * @param policy
   */
  policyDisplayOptions?: (
    policy: PackagePolicy
  ) => Pick<EuiSelectableOption, 'disabled' | 'toolTipContent' | 'toolTipProps'>;

  /** If `true`, then only a single selection will be allowed. Default is `false` */
  singleSelection?: boolean;
  'data-test-subj'?: string;
}

/**
 * Provides a component that displays the list of policies fetched from Fleet, which the user can select and unselect.
 */
export const PolicySelector = memo<PolicySelectorProps>(
  ({
    queryOptions: {
      kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
      sortField = 'name',
      sortOrder = 'asc',
      withAgentCount = true,
      perPage = 20,
    } = {},
    selectedPolicyIds,
    useCheckbox = false,
    showPolicyLink = false,
    policyDisplayOptions,
    singleSelection = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { getAppUrl } = useAppUrl();
    const { canReadPolicyManagement, canWriteIntegrationPolicies } =
      useUserPrivileges().endpointPrivileges;
    const [page, setPage] = useState(1);
    const {
      data: policyListResponse,
      isFetching,
      isLoading,
      error,
    } = useFetchIntegrationPolicyList(
      {
        kuery,
        sortOrder,
        sortField,
        perPage,
        withAgentCount,
        page,
      },
      { keepPreviousData: true }
    );

    const listProps: EuiSelectableProps['listProps'] = useMemo(() => {
      return {
        bordered: true,
        showIcons: !useCheckbox,
      };
    }, [useCheckbox]);

    const selectableOptions: Array<EuiSelectableOption<OptionPolicyData>> = useMemo(() => {
      if (!policyListResponse) {
        return [];
      }

      const isPolicySelected = new Set<string>(selectedPolicyIds);
      const buildLinkToApp = (policy: PackagePolicy): React.ReactNode | null => {
        if (!showPolicyLink) {
          return null;
        }

        const isEndpointPolicy = policy.package?.name === 'endpoint';

        if ((isEndpointPolicy && !canReadPolicyManagement) || !canWriteIntegrationPolicies) {
          return null;
        }

        const appId = isEndpointPolicy ? APP_UI_ID : INTEGRATIONS_PLUGIN_ID;
        const urlPath = isEndpointPolicy
          ? getPolicyDetailPath(policy.id)
          : pagePathGetters.integration_policy_edit({ packagePolicyId: policy.id })[1];

        return (
          <LinkToApp
            href={getAppUrl({ path: urlPath, appId })}
            appPath={urlPath}
            target="_blank"
            data-test-subj={getTestId('policyLink')}
          >
            <FormattedMessage
              id="xpack.securitySolution.effectedPolicySelect.viewPolicyLinkLabel"
              defaultMessage="View policy"
            />
          </LinkToApp>
        );
      };

      return policyListResponse.items.map<EuiSelectableOption<OptionPolicyData>>((policy) => {
        const customDisplayOptions: CustomPolicyDisplayOptions = policyDisplayOptions
          ? policyDisplayOptions(policy)
          : {};

        return {
          disabled: false,
          ...customDisplayOptions,
          label: policy.name,
          className: 'policy-name',
          'data-test-subj': getTestId(`policy-${policy.id}`),
          policy,
          checked: isPolicySelected.has(policy.id) ? 'on' : undefined,
          prepend: useCheckbox ? (
            <EuiCheckbox
              id={htmlIdGenerator()()}
              onChange={NOOP}
              checked={isPolicySelected.has(policy.id)}
              disabled={customDisplayOptions.disabled ?? false}
              data-test-subj={getTestId(`policy-${policy.id}-checkbox`)}
            />
          ) : undefined,
          append: showPolicyLink ? buildLinkToApp(policy) : null,
        };
      });
    }, [
      canReadPolicyManagement,
      canWriteIntegrationPolicies,
      getAppUrl,
      getTestId,
      policyDisplayOptions,
      policyListResponse,
      selectedPolicyIds,
      showPolicyLink,
      useCheckbox,
    ]);

    // FIXME:PT handle API errors
    // FIXME:PT add loader indicator for when next page of data is retrieved

    const listBuilderCallback = useCallback<NonNullable<EuiSelectableProps['children']>>(
      (list, search) => {
        return (
          <>
            {search} {list}
          </>
        );
      },
      []
    );

    const handleOnPolicySelectChange = useCallback<
      Required<EuiSelectableProps<OptionPolicyData>>['onChange']
    >((currentOptions) => {
      // FIXME:PT implement
    }, []);

    const onPageClickHandler: Required<EuiPaginationProps>['onPageClick'] = useCallback(
      (activePage) => {
        setPage(activePage + 1);
      },
      []
    );

    return (
      <PolicySelectorContainer data-test-subj={dataTestSubj}>
        <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
          {'search bar here'}
        </EuiPanel>

        <div className="selectable-container">
          {isFetching && <EuiProgress size="xs" color="accent" position="absolute" />}

          <EuiSelectable<OptionPolicyData>
            options={selectableOptions}
            listProps={listProps}
            onChange={handleOnPolicySelectChange}
            searchable={false}
            singleSelection={singleSelection}
            isLoading={isLoading}
            // searchProps={SEARCH_PROPS}
            data-test-subj={getTestId('list')}
          >
            {listBuilderCallback}
          </EuiSelectable>
        </div>

        <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
          <EuiPagination
            aria-label={i18n.translate(
              'xpack.securitySolution.policySelector.policyListPagination',
              { defaultMessage: 'Policy list pagination' }
            )}
            pageCount={Math.ceil((policyListResponse?.total ?? 0) / perPage)}
            activePage={(policyListResponse?.page ?? 1) - 1}
            onPageClick={onPageClickHandler}
          />
        </EuiPanel>
      </PolicySelectorContainer>
    );
  }
);
PolicySelector.displayName = 'PolicySelector';
