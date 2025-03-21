/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiFilterGroup, EuiPopover, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PolicySelectorProps } from './policy_selector';
import { PolicySelector } from './policy_selector';

export type PolicySelectorMenuButtonProps = PolicySelectorProps;

export const PolicySelectorMenuButton = memo<PolicySelectorMenuButtonProps>((props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const button = useMemo(
    () => (
      <EuiFilterButton
        iconType="arrowDown"
        data-test-subj="policiesSelectorButton"
        onClick={() => {
          setIsPopoverOpen((prevState) => !prevState);
        }}
        isSelected={isPopoverOpen}
        numFilters={1000000}
        hasActiveFilters={true}
        numActiveFilters={500}
      >
        <EuiText>
          <FormattedMessage
            id="xpack.securitySolution.management.policiesSelector.label"
            defaultMessage="Policies"
          />
        </EuiText>
      </EuiFilterButton>
    ),
    [isPopoverOpen]
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
        <PolicySelector {...props} />
      </EuiPopover>
    </EuiFilterGroup>
  );
});
PolicySelectorMenuButton.displayName = 'PolicySelectorMenuButton';
