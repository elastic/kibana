/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiFilterGroup, EuiPopover, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import type { PolicySelectorProps } from './policy_selector';
import { PolicySelector } from './policy_selector';

export type PolicySelectorMenuButtonProps = PolicySelectorProps;

/**
 * A policy selector button - user is shown the list of policies when they click on the button.
 * Count of selections are reflected on the button.
 */
export const PolicySelectorMenuButton = memo<PolicySelectorMenuButtonProps>((props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [countOfPolicies, setCountOfPolicies] = useState(0);
  const getTestId = useTestIdGenerator(props['data-test-subj']);

  const countOfSelectedPolicies: number = useMemo(() => {
    return (
      props.selectedPolicyIds.length +
      (props.additionalListItems ?? []).filter((additionalItem) => additionalItem.checked === 'on')
        .length
    );
  }, [props.additionalListItems, props.selectedPolicyIds.length]);

  const onFetch: Required<PolicySelectorMenuButtonProps>['onFetch'] = useCallback(
    (fetchedData) => {
      const { type, filtered, data } = fetchedData;

      if (type === 'search' && !filtered) {
        setCountOfPolicies(data.total + (props.additionalListItems ?? []).length);
      }

      if (props.onFetch) {
        props.onFetch(fetchedData);
      }
    },
    [props]
  );

  const button = useMemo(
    () => (
      <EuiFilterButton
        iconType="arrowDown"
        data-test-subj={getTestId()}
        onClick={() => {
          setIsPopoverOpen((prevState) => !prevState);
        }}
        isSelected={isPopoverOpen}
        numFilters={countOfPolicies > 0 ? countOfPolicies : undefined}
        hasActiveFilters={countOfSelectedPolicies > 0}
        numActiveFilters={countOfSelectedPolicies}
        disabled={props.isDisabled}
      >
        <EuiText>
          <FormattedMessage
            id="xpack.securitySolution.management.policiesSelector.label"
            defaultMessage="Policies"
          />
        </EuiText>
      </EuiFilterButton>
    ),
    [getTestId, isPopoverOpen, countOfPolicies, countOfSelectedPolicies, props.isDisabled]
  );

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <PolicySelector {...props} onFetch={onFetch} data-test-subj={getTestId('policySelector')} />
      </EuiPopover>
    </EuiFilterGroup>
  );
});
PolicySelectorMenuButton.displayName = 'PolicySelectorMenuButton';
