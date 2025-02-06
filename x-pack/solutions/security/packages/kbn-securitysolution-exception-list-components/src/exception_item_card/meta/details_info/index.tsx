/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from '../../translations';

interface MetaInfoDetailsProps {
  label: string;
  lastUpdate: JSX.Element | string;
  lastUpdateValue?: string;
  dataTestSubj?: string;
}

export const MetaInfoDetails = memo<MetaInfoDetailsProps>(
  ({ label, lastUpdate, lastUpdateValue, dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();
    const euiBadgeFontFamily = css`
      font-family: ${euiTheme.font.family};
    `;

    return (
      <EuiFlexGroup
        data-test-subj={`${dataTestSubj || ''}metaInfoDetails`}
        alignItems="center"
        gutterSize="s"
        wrap
        responsive
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" css={euiBadgeFontFamily}>
            {label}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} data-test-subj={`${dataTestSubj || ''}lastUpdate`}>
          <EuiBadge color="default" css={euiBadgeFontFamily}>
            {lastUpdate}
          </EuiBadge>
        </EuiFlexItem>
        {lastUpdateValue != null && (
          <>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" css={euiBadgeFontFamily}>
                {i18n.EXCEPTION_ITEM_CARD_META_BY}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} data-test-subj={`${dataTestSubj || ''}lastUpdateValue`}>
              <EuiFlexGroup responsive gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" css={euiBadgeFontFamily}>
                    {lastUpdateValue}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    );
  }
);

MetaInfoDetails.displayName = 'MetaInfoDetails';
