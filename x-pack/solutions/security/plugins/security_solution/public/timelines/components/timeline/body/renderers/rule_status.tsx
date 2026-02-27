/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import { getOr } from 'lodash/fp';

import styled from 'styled-components';
import { STATUS_BUTTON_TEST_ID } from '../../../../../flyout/document_details/right/components/test_ids';

const mapping = {
  open: 'primary',
  acknowledged: 'warning',
  closed: 'default',
};

const StyledEuiBadge = styled(EuiBadge)`
  text-transform: capitalize;
`;

interface BaseProps {
  value: string | number | undefined | null;
}

type Props = BaseProps &
  Pick<EuiBadgeProps, 'iconType' | 'iconSide' | 'onClick' | 'onClickAriaLabel'>;

const RuleStatusComponent: React.FC<Props> = ({
  value,
  onClick,
  onClickAriaLabel,
  iconSide,
  iconType,
}) => {
  const color = useMemo(() => getOr('default', `${value}`, mapping), [value]);
  const badge = (
    <StyledEuiBadge
      color={color}
      onClick={onClick}
      onClickAriaLabel={onClickAriaLabel}
      iconType={iconType}
      iconSide={iconSide}
      data-test-subj={STATUS_BUTTON_TEST_ID}
    >
      {value}
    </StyledEuiBadge>
  );

  return badge;
};

export const RuleStatus = React.memo(RuleStatusComponent);
RuleStatus.displayName = 'RuleStatus';
