/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ElementType, FC, memo } from 'react';
import { EuiExpression, EuiToken, EuiFlexGroup, useEuiTheme, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { Entry } from '../types';
import * as i18n from '../../translations';
import { getValue, getValueExpression } from './entry_content.helper';

interface EntryContentProps {
  entry: Entry;
  index: number;
  isNestedEntry?: boolean;
  dataTestSubj?: string;
  showValueListModal: ElementType;
}

export const EntryContent: FC<EntryContentProps> = memo(
  ({ entry, index, isNestedEntry = false, dataTestSubj, showValueListModal }) => {
    const { field, type } = entry;
    const value = getValue(entry);
    const operator = 'operator' in entry ? entry.operator : '';

    const { euiTheme } = useEuiTheme();
    const nestedGroupSpaceStyles = css`
      margin-left: ${euiTheme.size.l};
      margin-bottom: ${euiTheme.size.xs};
      padding-top: ${euiTheme.size.xs};
    `;
    const valueContainerStyles = css`
      flex-direction: row;
    `;

    const entryKey = `${field}${type}${value}${index}`;
    return (
      <div data-test-subj={`${dataTestSubj || ''}${entryKey}EntryContent`} key={entryKey}>
        {isNestedEntry ? (
          <EuiFlexGroup
            css={nestedGroupSpaceStyles}
            responsive={false}
            alignItems="center"
            gutterSize="l"
            data-test-subj={`${dataTestSubj || ''}NestedEntry`}
          >
            <EuiToken data-test-subj="nstedEntryIcon" iconType="tokenNested" size="s" />
            <EuiFlexItem css={valueContainerStyles}>
              <EuiExpression description="" value={field} color="subdued" />
              {getValueExpression(
                type as ListOperatorTypeEnum,
                operator,
                value,
                showValueListModal
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <>
            <EuiExpression
              description={index === 0 ? '' : i18n.CONDITION_AND}
              value={field}
              color={index === 0 ? 'primary' : 'subdued'}
              data-test-subj={`${dataTestSubj || ''}SingleEntry`}
            />
            {getValueExpression(type as ListOperatorTypeEnum, operator, value, showValueListModal)}
          </>
        )}
      </div>
    );
  }
);
EntryContent.displayName = 'EntryContent';
