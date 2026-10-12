/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import React from 'react';
import { EuiLink, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';

export const RunCountCell = ({
  count,
  viewLabel,
  testSubject,
  onOpen,
}: {
  count?: number;
  viewLabel: string;
  testSubject: string;
  onOpen: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  if (!count) {
    return (
      <EuiText size="s" color="subdued" data-test-subj={testSubject}>
        –
      </EuiText>
    );
  }
  return (
    <EuiToolTip content={viewLabel}>
      <EuiLink
        color="primary"
        data-test-subj={testSubject}
        css={{
          fontWeight: euiTheme.font.weight.semiBold,
          fontVariantNumeric: 'tabular-nums',
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        }}
        onClick={onOpen}
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.VIEW_AUTOMATION_RUNS,
          element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
        })}
      >
        {count}
      </EuiLink>
    </EuiToolTip>
  );
};
