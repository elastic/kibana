/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiFieldSearchProps } from '@elastic/eui';
import {
  EuiSelectable,
  useEuiTheme,
  type EuiSelectableProps,
  type EuiSelectableOption,
  EuiCheckbox,
  htmlIdGenerator,
  EuiPanel,
  EuiPagination,
  EuiProgress,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import type { GetPackagePoliciesRequest, PackagePolicy } from '@kbn/fleet-plugin/common';
import { INTEGRATIONS_PLUGIN_ID, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import type { EuiPaginationProps } from '@elastic/eui/src/components/pagination/pagination';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import { css } from '@emotion/react';
import { APP_UI_ID } from '../../../../common';
import { useAppUrl, useToasts } from '../../../common/lib/kibana';
import { LinkToApp } from '../../../common/components/endpoint';
import { useFetchIntegrationPolicyList } from '../../hooks/policy/use_fetch_integration_policy_list';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { getPolicyDetailPath } from '../../common/routing';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { getEmptyTagValue } from '../../../common/components/empty_value';

const NOOP = () => {};
const PolicySelectorContainer = styled.div<{ height?: string }>`
  .header-container {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .body-container {
    height: ${(props) => props.height ?? '200px'};
    position: relative;
    border-top: none;
    border-bottom: none;
    border-radius: 0;
  }

  .footer-container {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
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

type AdditionalListItemProps = Omit<EuiSelectableOption, 'prepend'>;

export interface PolicySelectorProps {
  /** The list of policy IDs that are currently selected */
  selectedPolicyIds: string[];
  /** Callback for when selection changes occur. */
  onChange: (
    updatedSelectedPolicyIds: string[],
    updatedAdditionalListItems?: AdditionalListItemProps[]
  ) => void;
  /**
   * Any query options supported by the fleet api. The defaults applied will filter for only
   * Endpoint integration policies sorted by name.
   */
  queryOptions?: Pick<
    GetPackagePoliciesRequest['query'],
    'perPage' | 'kuery' | 'sortField' | 'sortOrder' | 'withAgentCount'
  >;
  /**
   * A list of Integration policy fields that should be used when user enters a search value. The
   * fields should match those that are defined in the `PackagePolicy` type, including deep
   * references like `package.name`, etc.
   * Default: `['name', 'id', 'description', 'policy_ids', 'package.name']`
   */
  searchFields?: string[];
  /**
   * A set of additional items to include in the selectable list. Items will be displayed at the
   * bottom of each policy page.
   */
  additionalListItems?: AdditionalListItemProps[];
  /** A css size value for the height of the area that shows the policies. Default is `200px` */
  height?: string;
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
 * Provides a component that displays a list of policies fetched from Fleet, which the user can
 * select and unselect.
 */
export const PolicySelector = memo<PolicySelectorProps>(
  ({
    queryOptions: {
      // TODO:PT define central `const` for this and refactor other areas that currently use it
      kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
      sortField = 'name',
      sortOrder = 'asc',
      withAgentCount = true,
      perPage = 20,
    } = {},
    selectedPolicyIds,
    searchFields = ['id', 'name', 'description', 'policy_ids', 'package.name'],
    onChange,
    height,
    useCheckbox = false,
    showPolicyLink = false,
    policyDisplayOptions,
    singleSelection = false,
    additionalListItems = [],
    'data-test-subj': dataTestSubj,
  }) => {
    // TODO:PT add support for showing static selections (for Global, Unassigned)
    const { euiTheme } = useEuiTheme();
    const toasts = useToasts();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { getAppUrl } = useAppUrl();
    const { canReadPolicyManagement, canWriteIntegrationPolicies } =
      useUserPrivileges().endpointPrivileges;
    const [page, setPage] = useState(1);
    const [userSearchValue, setUserSearchValue] = useState('');
    const [searchKuery, setSearchKuery] = useState('');

    // Delays setting the `searchKuery` for a few seconds - allowing the user to pause typing - so
    // that we don't call the API on every character change.
    useDebounce(
      () => {
        setPage(1);

        if (userSearchValue) {
          const kueryWithSearchValue: string = searchFields
            .map((field) => `(${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.${field}:*${userSearchValue}*)`)
            .join(' OR ');

          if (kuery) {
            setSearchKuery(`(${kuery}) AND (${kueryWithSearchValue})`);
            return;
          }

          setSearchKuery(kueryWithSearchValue);
          return;
        }

        setSearchKuery(kuery);
      },
      300,
      [userSearchValue, kuery]
    );

    const {
      data: policyListResponse,
      isFetching,
      isLoading,
      error,
    } = useFetchIntegrationPolicyList(
      {
        kuery: searchKuery,
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
        bordered: false,
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

      return policyListResponse.items
        .map<EuiSelectableOption<OptionPolicyData>>((policy) => {
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
        })
        .concat(
          ...additionalListItems.map((additionalItem) => {
            return {
              ...additionalItem,
              'data-type': 'customItem',
              prepend: useCheckbox ? (
                <EuiCheckbox
                  id={htmlIdGenerator()()}
                  onChange={NOOP}
                  checked={additionalItem.checked === 'on'}
                  disabled={additionalItem.disabled ?? false}
                  data-test-subj={getTestId(
                    `${additionalItem['data-test-subj'] ?? getTestId('additionalItem')}-checkbox`
                  )}
                />
              ) : null,
            } as unknown as EuiSelectableOption<OptionPolicyData>;
          })
        );
    }, [
      additionalListItems,
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

    const listBuilderCallback = useCallback<NonNullable<EuiSelectableProps['children']>>(
      (list, _search) => {
        return <>{list}</>;
      },
      []
    );

    const handleOnPolicySelectChange = useCallback<
      Required<EuiSelectableProps<OptionPolicyData>>['onChange']
    >(
      (updatedOptions, _ev, changedOption) => {
        // @ts-expect-error
        const isChangedOptionCustom = changedOption['data-type'] === 'customItem';
        const updatedPolicyIds = !isChangedOptionCustom
          ? changedOption.checked === 'on'
            ? selectedPolicyIds.concat(changedOption.policy.id)
            : selectedPolicyIds.filter((id) => id !== changedOption.policy.id)
          : selectedPolicyIds;

        const updatedAdditionalItems: AdditionalListItemProps[] = isChangedOptionCustom
          ? updatedOptions
              // @ts-expect-error
              .filter((option) => option['data-type'] === 'customItem')
              // @ts-expect-error
              .map(({ prepend, 'data-type': dataType, ...option }) => option)
          : additionalListItems;

        return onChange(updatedPolicyIds, updatedAdditionalItems);
      },
      [additionalListItems, onChange, selectedPolicyIds]
    );

    const onPageClickHandler: Required<EuiPaginationProps>['onPageClick'] = useCallback(
      (activePage) => {
        setPage(activePage + 1);
      },
      []
    );

    const onSearchHandler: Required<EuiFieldSearchProps>['onSearch'] = useCallback(
      (updatedSearchValue) => {
        setUserSearchValue(updatedSearchValue);
      },
      []
    );

    const onSearchInputChangeHandler: Required<EuiFieldSearchProps>['onChange'] = useCallback(
      (ev) => {
        setUserSearchValue(ev.target.value);
      },
      []
    );

    useEffect(() => {
      if (error) {
        toasts.addError(error, {
          title: i18n.translate('xpack.securitySolution.policySelector.apiFetchErrorToastTitle', {
            defaultMessage: 'Failed to fetch list of policies',
          }),
          toastMessage: error.body ? JSON.stringify(error.body) : undefined,
        });
      }
    }, [toasts, error]);

    return (
      <PolicySelectorContainer data-test-subj={dataTestSubj} height={height}>
        <EuiPanel paddingSize="s" hasShadow={false} hasBorder className="header-container">
          <EuiFieldSearch
            placeholder={i18n.translate(
              'xpack.securitySolution.policySelector.searchbarPlaceholder',
              { defaultMessage: 'Search policies' }
            )}
            value={userSearchValue}
            onSearch={onSearchHandler}
            onChange={onSearchInputChangeHandler}
            incremental={false}
            isClearable
            fullWidth
            compressed
          />
        </EuiPanel>

        <EuiPanel paddingSize="s" hasShadow={false} hasBorder className="body-container">
          {isFetching && <EuiProgress size="xs" color="accent" position="absolute" />}

          <EuiSelectable<OptionPolicyData>
            options={selectableOptions}
            listProps={listProps}
            onChange={handleOnPolicySelectChange}
            searchable={false}
            singleSelection={singleSelection}
            isLoading={isLoading}
            height="full"
            // searchProps={SEARCH_PROPS}
            data-test-subj={getTestId('list')}
          >
            {listBuilderCallback}
          </EuiSelectable>
        </EuiPanel>

        <EuiPanel paddingSize="s" hasShadow={false} hasBorder className="footer-container">
          <EuiFlexGroup gutterSize="s" justifyContent="center" alignItems="center">
            <EuiFlexItem
              grow
              css={css`
                border-right: ${euiTheme.border.thin};
                padding-right: ${euiTheme.size.s};
              `}
            >
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.securitySolution.policySelector.selectedCount"
                  defaultMessage="{count} {count, plural, =1 {policy} other {policies}} selected"
                  values={{ count: selectedPolicyIds.length }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              css={css`
                border-right: ${euiTheme.border.thin};
                padding-right: ${euiTheme.size.s};
              `}
            >
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.securitySolution.policySelector.totalPoliciesFound"
                  defaultMessage="{count} {count, plural, =1 {policy} other {policies}} found"
                  values={{ count: policyListResponse?.total ?? 0 }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {policyListResponse && policyListResponse.total > 0 ? (
                <EuiPagination
                  aria-label={i18n.translate(
                    'xpack.securitySolution.policySelector.policyListPagination',
                    { defaultMessage: 'Policy list pagination' }
                  )}
                  pageCount={Math.ceil((policyListResponse?.total ?? 0) / perPage)}
                  activePage={(policyListResponse?.page ?? 1) - 1}
                  onPageClick={onPageClickHandler}
                />
              ) : (
                <EuiText size="s" color="textSu">
                  {getEmptyTagValue()}
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </PolicySelectorContainer>
    );
  }
);
PolicySelector.displayName = 'PolicySelector';
