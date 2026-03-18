/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { useRuleCustomizationsContext } from './rule_customizations_diff/rule_customizations_context';

interface PrebuiltRuleDiffBadgeProps {
  label: string;
  dataTestSubj?: string;
}

export const PrebuiltRuleDiffBadge = ({ label, dataTestSubj }: PrebuiltRuleDiffBadgeProps) => {
  const {
    actions: { openCustomizationsPreviewFlyout },
  } = useRuleCustomizationsContext();

  return (
    <EuiBadge
      data-test-subj={dataTestSubj}
      color="hollow"
      iconType="expand"
      iconSide="right"
      onClick={openCustomizationsPreviewFlyout}
      onClickAriaLabel={label}
      title="" // We surround all implementations of the badge with a tooltip on hover
    >
      {label}
    </EuiBadge>
  );
};
