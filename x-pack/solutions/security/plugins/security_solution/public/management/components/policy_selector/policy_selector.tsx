/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type EuiSelectableProps,
  type EuiSelectableOption,
  type EuiFieldSearchProps,
  EuiSelectable,
  EuiEmptyPrompt,
  EuiCheckbox,
  EuiSpacer,
  htmlIdGenerator,
  EuiPanel,
  EuiPagination,
  EuiProgress,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiToolTip,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import type {
  GetPackagePoliciesRequest,
  GetPackagePoliciesResponse,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import { INTEGRATIONS_PLUGIN_ID, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import type { EuiPaginationProps } from '@elastic/eui/src/components/pagination/pagination';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import { css } from '@emotion/react';
import { useFetchPolicyData } from './hooks/use_fetch_policy_data';
import { APP_UI_ID } from '../../../../common';
import { useAppUrl, useToasts } from '../../../common/lib/kibana';
import { LinkToApp } from '../../../common/components/endpoint';
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
    position: relative;
    border-top: none;
    border-bottom: none;
    border-radius: 0;
  }

  .footer-container {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .list-container {
    height: ${(props) => props.height ?? '225px'};
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

  .border-right {
    border-right: ${({ theme }) => theme.euiTheme.border.thin};
    padding-right: ${({ theme }) => theme.euiTheme.size.s};
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
   * Default: `['name', 'description']`
   */
  searchFields?: string[];
  /**
   * Callback function that is called everytime a new page of data is fetched from fleet. Use it
   * if needing to gain access to the API results that are returned
   */
  onFetch?: (apiFetchResult: {
    /**
     * The type of data search. Will be set to `search` when fetching policies that are available
     * in the system, and to `selected` if the fetching of data was for policies that were selected.
     */
    type: 'search' | 'selected';
    /** The filter that was entered by the user (if any). Applies only to `type === search`. */
    filtered: boolean;
    /** The data returned from the API */
    data: GetPackagePoliciesResponse;
  }) => void;
  /**
   * A set of additional items to include in the selectable list. Items will be displayed at the
   * bottom of each policy page.
   */
  additionalListItems?: AdditionalListItemProps[];
  /** A css size value for the height of the area that shows the policies. Default is `225px` */
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
  /** Disable selector */
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

/**
 * Provides a component that displays a list of policies fetched from Fleet, which the user can
 * select and unselect. By default, it queries Fleet for Elastic Defend policies, but that can be
 * configured via `queryOptions.kuery`, thus it can display any type of Fleet integration policies
 */
export const PolicySelector = memo<PolicySelectorProps>(
  ({
    queryOptions: {
      kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
      sortField = 'name',
      sortOrder = 'asc',
      withAgentCount = false,
      perPage = 20,
    } = {},
    selectedPolicyIds,
    searchFields = ['name', 'description'],
    onChange,
    onFetch,
    height,
    useCheckbox = false,
    showPolicyLink = false,
    policyDisplayOptions,
    singleSelection = false,
    additionalListItems = [],
    isDisabled = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const toasts = useToasts();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { getAppUrl } = useAppUrl();
    const { canReadPolicyManagement, canWriteIntegrationPolicies } =
      useUserPrivileges().endpointPrivileges;
    const [page, setPage] = useState(1);
    const [selectedListPage, setSelectedListPage] = useState(1);
    const [userSearchValue, setUserSearchValue] = useState('');
    const [searchKuery, setSearchKuery] = useState(kuery);
    const [view, setView] = useState<'full-list' | 'selected-list'>('full-list');
    const reactWindowFixedSizeList = useRef<{ scrollToItem: (index: number) => void }>();
    const handledApiData = useRef(new WeakSet<GetPackagePoliciesResponse>());

    // Delays setting the `searchKuery` value thus allowing the user to pause typing - so
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
    } = useFetchPolicyData(
      {
        kuery: searchKuery,
        sortOrder,
        sortField,
        perPage,
        withAgentCount,
        page: view === 'full-list' ? page : selectedListPage,
      },
      selectedPolicyIds,
      view
    );

    const selectedCount = useMemo(() => {
      return (
        selectedPolicyIds.length +
        additionalListItems.filter((item) => item.checked === 'on').length
      );
    }, [additionalListItems, selectedPolicyIds.length]);

    const totalItems: number = useMemo(() => {
      return (
        (policyListResponse?.total ?? 0) +
          (additionalListItems ?? []).filter((item) => !item.isGroupLabel).length ?? 0
      );
    }, [additionalListItems, policyListResponse?.total]);

    // @ts-expect-error EUI does not seem to have correctly types the `windowProps` which come from React-Window `FixedSizeList` component
    const listProps: EuiSelectableProps['listProps'] = useMemo(() => {
      return {
        bordered: false,
        showIcons: !useCheckbox,
        windowProps: {
          ref: reactWindowFixedSizeList,
        },
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
            data-test-subj={getTestId(`policy-${policy.id}-policyLink`)}
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
            disabled: isDisabled,
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
                disabled={customDisplayOptions.disabled ?? isDisabled}
                data-test-subj={getTestId(`policy-${policy.id}-checkbox`)}
              />
            ) : undefined,
            append: showPolicyLink ? buildLinkToApp(policy) : null,
          };
        })
        .concat(
          ...additionalListItems
            .filter(
              (additionalItem) => !(view === 'selected-list' && additionalItem.checked !== 'on')
            )
            .map((additionalItem) => {
              return {
                disabled: isDisabled,
                ...additionalItem,
                'data-type': 'customItem',
                prepend:
                  useCheckbox && !additionalItem.isGroupLabel ? (
                    <EuiCheckbox
                      id={htmlIdGenerator()()}
                      onChange={NOOP}
                      checked={additionalItem.checked === 'on'}
                      disabled={additionalItem.disabled ?? isDisabled}
                      data-test-subj={getTestId(
                        `${additionalItem['data-test-subj'] ?? 'additionalItem'}-checkbox`
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
      isDisabled,
      policyDisplayOptions,
      policyListResponse,
      selectedPolicyIds,
      showPolicyLink,
      useCheckbox,
      view,
    ]);

    const noPoliciesFoundEmptyState = useMemo(() => {
      return (
        <>
          <EuiSpacer size="m" />
          <EuiEmptyPrompt
            title={<h3>{'No policies found'}</h3>}
            titleSize="s"
            paddingSize="m"
            color="subdued"
            data-test-subj={getTestId('noPolicies')}
            body={
              userSearchValue ? (
                <EuiText size="s">{'Your search criteria did not match any policy'}</EuiText>
              ) : null
            }
          />
        </>
      );
    }, [getTestId, userSearchValue]);

    const isCustomOption = useCallback((option: EuiSelectableOption) => {
      // @ts-expect-error
      return option['data-type'] === 'customItem';
    }, []);

    const getUpdatedAdditionalListItems = useCallback(
      (
        updatedItem: AdditionalListItemProps,
        listOfAdditionalItems: AdditionalListItemProps[]
      ): AdditionalListItemProps[] => {
        return listOfAdditionalItems.map((item) => {
          if (item.label === updatedItem.label) {
            return {
              ...item,
              checked: updatedItem.checked,
            };
          }

          return item;
        });
      },
      []
    );

    const listBuilderCallback = useCallback<NonNullable<EuiSelectableProps['children']>>(
      (list, _search) => {
        return <>{list}</>;
      },
      []
    );

    const getUpdatedSelectedPolicyIds = useCallback(
      (addToList: string[], removeFromList: string[]) => {
        return Array.from(
          new Set(
            selectedPolicyIds.filter((id) => !removeFromList.includes(id)).concat(...addToList)
          )
        );
      },
      [selectedPolicyIds]
    );

    const handleOnPolicySelectChange = useCallback<
      Required<EuiSelectableProps<OptionPolicyData>>['onChange']
    >(
      (_updatedOptions, _ev, changedOption) => {
        const isChangedOptionCustom = isCustomOption(changedOption);
        const updatedPolicyIds = !isChangedOptionCustom
          ? changedOption.checked === 'on'
            ? selectedPolicyIds.concat(changedOption.policy.id)
            : selectedPolicyIds.filter((id) => id !== changedOption.policy.id)
          : selectedPolicyIds;

        const updatedAdditionalItems: AdditionalListItemProps[] = isChangedOptionCustom
          ? getUpdatedAdditionalListItems(changedOption, additionalListItems)
          : additionalListItems;

        return onChange(updatedPolicyIds, updatedAdditionalItems);
      },
      [
        additionalListItems,
        getUpdatedAdditionalListItems,
        isCustomOption,
        onChange,
        selectedPolicyIds,
      ]
    );

    const onPageClickHandler: Required<EuiPaginationProps>['onPageClick'] = useCallback(
      (activePage) => {
        if (view === 'selected-list') {
          setSelectedListPage(activePage + 1);
        } else {
          setPage(activePage + 1);
        }
      },
      [view]
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

    const viewSelectedOnClickHandler = useCallback(() => {
      setView((prevState) => (prevState === 'selected-list' ? 'full-list' : 'selected-list'));
    }, []);

    const onSelectUnselectAllClickHandler = useCallback(
      (ev: React.MouseEvent<HTMLButtonElement>) => {
        const isSelectAll = ev.currentTarget.value === 'selectAll';
        const policiesToSelect: string[] = [];
        const policiesToUnSelect: string[] = [];
        let updatedAdditionalItems = additionalListItems;

        for (const option of selectableOptions) {
          if (isSelectAll) {
            if (!isCustomOption(option)) {
              policiesToSelect.push(option.policy.id);
            } else {
              updatedAdditionalItems = getUpdatedAdditionalListItems(
                { ...option, checked: 'on' },
                updatedAdditionalItems
              );
            }
          } else {
            if (!isCustomOption(option)) {
              policiesToUnSelect.push(option.policy.id);
            } else {
              updatedAdditionalItems = getUpdatedAdditionalListItems(
                {
                  ...option,
                  checked: undefined,
                },
                updatedAdditionalItems
              );
            }
          }
        }

        onChange(
          getUpdatedSelectedPolicyIds(policiesToSelect, policiesToUnSelect),
          updatedAdditionalItems
        );
      },
      [
        additionalListItems,
        getUpdatedAdditionalListItems,
        getUpdatedSelectedPolicyIds,
        isCustomOption,
        onChange,
        selectableOptions,
      ]
    );

    // Show API errors when they are encountered
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

    // When viewing Selected Policies, if they are all "un-selected", then set the view back to 'full-list'
    useEffect(() => {
      if (view === 'selected-list' && selectedCount === 0) {
        setView('full-list');
      }
    }, [selectedCount, view]);

    // Everytime the `data` changes:
    //    1. scroll list back up to the top
    //    2. call `onFetch()` if defined
    useEffect(() => {
      if (policyListResponse && !isFetching && !handledApiData.current.has(policyListResponse)) {
        handledApiData.current.add(policyListResponse);

        if (reactWindowFixedSizeList.current) {
          reactWindowFixedSizeList.current.scrollToItem(0);
        }

        if (onFetch) {
          onFetch({
            type: view === 'selected-list' ? 'selected' : 'search',
            filtered: Boolean(userSearchValue),
            data: policyListResponse,
          });
        }
      }
    }, [isFetching, onFetch, policyListResponse, userSearchValue, view]);

    return (
      <PolicySelectorContainer data-test-subj={dataTestSubj} height={height}>
        <EuiPanel paddingSize="s" hasShadow={false} hasBorder className="header-container">
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiToolTip
                content={
                  view === 'selected-list' ? (
                    <FormattedMessage
                      id="xpack.securitySolution.policySelector.searchbarTooltipMessage"
                      defaultMessage="Search is not available when viewing selected policies"
                    />
                  ) : null
                }
              >
                <EuiFieldSearch
                  placeholder={i18n.translate(
                    'xpack.securitySolution.policySelector.searchbarPlaceholder',
                    { defaultMessage: 'Search policies' }
                  )}
                  value={userSearchValue}
                  onSearch={onSearchHandler}
                  onChange={onSearchInputChangeHandler}
                  incremental={false}
                  disabled={isDisabled || view === 'selected-list'}
                  data-test-subj={getTestId('searchbar')}
                  isClearable
                  fullWidth
                  compressed
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="filter"
                size="s"
                onClick={viewSelectedOnClickHandler}
                disabled={selectedCount === 0}
                fill={view === 'selected-list'}
                data-test-subj={getTestId('viewSelectedButton')}
              >
                <FormattedMessage
                  id="xpack.securitySolution.policySelector.selectedButton"
                  defaultMessage="Selected"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiPanel paddingSize="s" hasShadow={false} hasBorder className="body-container">
          {isFetching && (
            <EuiProgress
              size="xs"
              color="accent"
              position="absolute"
              data-test-subj={getTestId('isFetching')}
            />
          )}

          {selectableOptions.length > 0 && (
            <EuiPanel
              paddingSize="xs"
              hasShadow={false}
              hasBorder={false}
              css={css`
                padding-top: 0 !important;
              `}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                {view === 'full-list' && (
                  <EuiFlexItem grow={false} className="border-right">
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="xpack.securitySolution.policySelector.selectAllTooltipMessage"
                          defaultMessage="Select all displayed in current page"
                        />
                      }
                    >
                      <EuiButtonEmpty
                        size="xs"
                        value="selectAll"
                        onClick={onSelectUnselectAllClickHandler}
                        data-test-subj={getTestId('selectAllButton')}
                        isDisabled={isDisabled}
                      >
                        <FormattedMessage
                          id="xpack.securitySolution.policySelector.selectAll"
                          defaultMessage="Select all"
                        />
                      </EuiButtonEmpty>
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="xpack.securitySolution.policySelector.unSelectAllTooltipMessage"
                        defaultMessage="Un-select all in current page"
                      />
                    }
                  >
                    <EuiButtonEmpty
                      size="xs"
                      value="unSelectAll"
                      onClick={onSelectUnselectAllClickHandler}
                      data-test-subj={getTestId('unselectAllButton')}
                      isDisabled={isDisabled}
                    >
                      <FormattedMessage
                        id="xpack.securitySolution.policySelector.unSelectAll"
                        defaultMessage="Un-select all"
                      />
                    </EuiButtonEmpty>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          )}

          <div className="list-container">
            <EuiSelectable<OptionPolicyData>
              options={selectableOptions}
              listProps={listProps}
              onChange={handleOnPolicySelectChange}
              searchable={false}
              singleSelection={singleSelection}
              isLoading={isLoading}
              height="full"
              data-test-subj={getTestId('list')}
              emptyMessage={noPoliciesFoundEmptyState}
            >
              {listBuilderCallback}
            </EuiSelectable>
          </div>
        </EuiPanel>

        <EuiPanel paddingSize="s" hasShadow={false} hasBorder className="footer-container">
          <EuiFlexGroup gutterSize="s" justifyContent="center" alignItems="center">
            <EuiFlexItem className="border-right">
              <EuiText size="s" data-test-subj={getTestId('policyFetchTotal')}>
                {view === 'selected-list' ? (
                  <FormattedMessage
                    id="xpack.securitySolution.policySelector.totalSelected"
                    defaultMessage="{selectedCount} selected"
                    values={{ selectedCount }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.policySelector.totalPoliciesFound"
                    defaultMessage="{selectedCount} of {count} selected"
                    values={{
                      selectedCount,
                      count: totalItems,
                    }}
                  />
                )}
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
                  data-test-subj={getTestId('pagination')}
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
