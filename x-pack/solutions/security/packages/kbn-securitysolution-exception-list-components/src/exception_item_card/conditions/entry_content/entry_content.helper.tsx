/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElementType } from 'react';
import React from 'react';
import { css } from '@emotion/css';
import { EuiExpression, EuiBadge } from '@elastic/eui';
import type { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ValueWithSpaceWarning } from '../../../..';
import { OPERATOR_TYPE_LABELS_EXCLUDED, OPERATOR_TYPE_LABELS_INCLUDED } from '../conditions.config';
import type { Entry } from '../types';

const entryValueWrapStyle = css`
  white-space: pre-wrap;
`;

const EntryValueWrap = ({ children }: { children: React.ReactNode }) => (
  <span className={entryValueWrapStyle}>{children}</span>
);

// @ts-ignore
const getEntryValue = (type: string, value: string | string[], showValueListModal: ElementType) => {
  const ShowValueListModal = showValueListModal;
  if (type === 'match_any' && Array.isArray(value)) {
    return value.map((currentValue, index) => (
      <EuiBadge key={index} data-test-subj={`matchAnyBadge${index}`} color="hollow">
        <EntryValueWrap>{currentValue}</EntryValueWrap>
      </EuiBadge>
    ));
  } else if (type === 'list' && value) {
    return (
      <ShowValueListModal shouldShowContentIfModalNotAvailable listId={value.toString()}>
        {value}
      </ShowValueListModal>
    );
  }
  // @ts-expect-error upgrade typescript v5.9.3
  return <EntryValueWrap>{value}</EntryValueWrap> ?? '';
};

export const getEntryOperator = (type: ListOperatorTypeEnum, operator: string) => {
  if (type === 'nested') return '';
  return operator === 'included'
    ? OPERATOR_TYPE_LABELS_INCLUDED[type] ?? type
    : OPERATOR_TYPE_LABELS_EXCLUDED[type] ?? type;
};

export const getValue = (entry: Entry) => {
  if (entry.type === 'list') return entry.list.id;

  return 'value' in entry ? entry.value : '';
};

export const getValueExpression = (
  type: ListOperatorTypeEnum,
  operator: string,
  value: string | string[],
  showValueListModal: ElementType
) => (
  <>
    <EuiExpression
      description={getEntryOperator(type, operator)}
      value={getEntryValue(type, value, showValueListModal)}
      data-test-subj="entryValueExpression"
    />
    <ValueWithSpaceWarning value={value} />
  </>
);
