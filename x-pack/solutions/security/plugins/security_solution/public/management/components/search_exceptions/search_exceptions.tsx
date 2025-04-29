/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiFieldSearchProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PolicySelectorMenuButtonProps } from '../policy_selector';
import { PolicySelectorMenuButton } from '../policy_selector';
import { useUserPrivileges } from '../../../common/components/user_privileges';

const GLOBAL_ENTRIES = i18n.translate(
  'xpack.securitySolution.management.policiesSelector.globalEntries',
  {
    defaultMessage: 'Global entries',
  }
);
const UNASSIGNED_ENTRIES = i18n.translate(
  'xpack.securitySolution.management.policiesSelector.unassignedEntries',
  {
    defaultMessage: 'Unassigned entries',
  }
);

export interface SearchExceptionsProps {
  defaultValue?: string;
  placeholder: string;
  hasPolicyFilter?: boolean;
  defaultIncludedPolicies?: string;
  hideRefreshButton?: boolean;
  onSearch(
    /** The query string the user entered into the text field */
    query: string,
    /** A list of policy id's comma delimited */
    includedPolicies: string | undefined,
    /** Will be `true` if the user clicked the `refresh` button */
    refresh: boolean
  ): void;
}

export const SearchExceptions = memo<SearchExceptionsProps>(
  ({
    defaultValue = '',
    onSearch,
    placeholder,
    hasPolicyFilter,
    defaultIncludedPolicies = '',
    hideRefreshButton = false,
  }) => {
    const { canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;
    const initiallySelectedPolicies = useMemo(() => {
      return Array.from(
        new Set(defaultIncludedPolicies.split(',').filter((id) => id.trim() !== ''))
      );
    }, [defaultIncludedPolicies]);
    const [query, setQuery] = useState<string>(defaultValue);
    const [includedPolicies, setIncludedPolicies] = useState<string[]>(
      initiallySelectedPolicies.filter((id) => id !== 'global' && id !== 'unassigned')
    );

    const [additionalSelectionItems, setAdditionalSelectionItems] = useState<
      Required<PolicySelectorMenuButtonProps>['additionalListItems']
    >([
      {
        label: i18n.translate(
          'xpack.securitySolution.searchExceptions.additionalFiltersGroupLabel',
          { defaultMessage: 'Additional filters' }
        ),
        isGroupLabel: true,
      },
      {
        label: GLOBAL_ENTRIES,
        data: { id: 'global' },
        checked: initiallySelectedPolicies.includes('global') ? 'on' : undefined,
        'data-test-subj': 'globalOption',
      },
      {
        label: UNASSIGNED_ENTRIES,
        data: { id: 'unassigned' },
        checked: initiallySelectedPolicies.includes('unassigned') ? 'on' : undefined,
        'data-test-subj': 'unassignedOption',
      },
    ]);

    const policySelectionOnChangeHandler = useCallback<PolicySelectorMenuButtonProps['onChange']>(
      (updatedSelectedPolicyIds, updatedAdditionalListItems) => {
        setIncludedPolicies(updatedSelectedPolicyIds);

        const updatedFullSelection = [...updatedSelectedPolicyIds];

        if (updatedAdditionalListItems) {
          for (const additionalItem of updatedAdditionalListItems) {
            if (additionalItem.checked === 'on') {
              updatedFullSelection.push(additionalItem.data?.id);
            }
          }

          setAdditionalSelectionItems(updatedAdditionalListItems);
        }

        onSearch(query, updatedFullSelection.join(','), false);
      },
      [onSearch, query]
    );

    const handleOnChangeSearchField = useCallback(
      (ev: React.ChangeEvent<HTMLInputElement>) => setQuery(ev.target.value),
      [setQuery]
    );
    const handleOnSearch = useCallback(
      () => onSearch(query, includedPolicies.join(), true),
      [onSearch, query, includedPolicies]
    );

    const handleOnSearchQuery = useCallback<NonNullable<EuiFieldSearchProps['onSearch']>>(
      (value) => {
        onSearch(value, includedPolicies.join(), false);
      },
      [onSearch, includedPolicies]
    );

    return (
      <EuiFlexGroup
        data-test-subj="searchExceptions"
        direction="row"
        alignItems="center"
        gutterSize="m"
      >
        <EuiFlexItem>
          <EuiFieldSearch
            defaultValue={defaultValue}
            placeholder={placeholder}
            onChange={handleOnChangeSearchField}
            onSearch={handleOnSearchQuery}
            isClearable
            fullWidth
            data-test-subj="searchField"
          />
        </EuiFlexItem>
        {canCreateArtifactsByPolicy && hasPolicyFilter ? (
          <EuiFlexItem grow={false}>
            <PolicySelectorMenuButton
              selectedPolicyIds={includedPolicies}
              additionalListItems={additionalSelectionItems}
              onChange={policySelectionOnChangeHandler}
              data-test-subj="policiesSelectorButton"
            />
          </EuiFlexItem>
        ) : null}

        {!hideRefreshButton ? (
          <EuiFlexItem grow={false}>
            <EuiButton iconType="refresh" onClick={handleOnSearch} data-test-subj="searchButton">
              {i18n.translate('xpack.securitySolution.management.search.button', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }
);

SearchExceptions.displayName = 'SearchExceptions';
