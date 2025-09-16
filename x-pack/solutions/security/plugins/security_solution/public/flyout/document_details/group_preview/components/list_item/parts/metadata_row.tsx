/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  GROUPED_LIST_ITEM_RISK_TEST_ID,
  GROUPED_LIST_ITEM_IP_TEST_ID,
  GROUPED_LIST_ITEM_GEO_TEST_ID,
} from '../../../test_ids';
import type { GroupedListItem } from '../types';
import { RiskLevel } from './risk_level';

export interface MetadataRowProps {
  item: GroupedListItem;
}

const Flag: React.FC<{ countryCode?: string; countryName?: string }> = ({
  countryCode,
  countryName,
}) => {
  const { euiTheme } = useEuiTheme();

  if (!countryCode) return null;

  const code = countryCode.toLowerCase();
  // EUI exposes flag icons as 'flagXX'
  const iconType = `flag${code}`;
  return (
    <div
      css={css`
        display: flex;
        gap: ${euiTheme.size.xs};
      `}
    >
      <EuiText
        size="s"
        color="subdued"
        css={css`
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {'Geo'}
      </EuiText>

      <EuiIcon type={iconType} size="m" />

      {countryName && (
        <EuiText
          data-test-subj={GROUPED_LIST_ITEM_GEO_TEST_ID}
          size="s"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {countryName}
        </EuiText>
      )}
    </div>
  );
};

export const MetadataRow = ({ item }: MetadataRowProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup wrap gutterSize="m" responsive={false} alignItems="center" direction="row">
      {item.type === 'entity' && typeof item.risk === 'number' && (
        <EuiFlexItem grow={false}>
          <div
            data-test-subj={GROUPED_LIST_ITEM_RISK_TEST_ID}
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.xs};
            `}
          >
            <EuiText
              size="s"
              color="subdued"
              css={css`
                font-weight: ${euiTheme.font.weight.medium};
              `}
            >
              {'Risk'}
            </EuiText>
            <RiskLevel risk={item.risk} />
          </div>
        </EuiFlexItem>
      )}
      {item.ip && (
        <EuiFlexItem grow={false}>
          <div
            data-test-subj={GROUPED_LIST_ITEM_IP_TEST_ID}
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.xs};
            `}
          >
            <EuiText
              size="s"
              color="subdued"
              css={css`
                font-weight: ${euiTheme.font.weight.medium};
              `}
            >
              {'IP:'}
            </EuiText>
            <EuiText
              size="s"
              color="default"
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
            >
              {item.ip}
            </EuiText>
          </div>
        </EuiFlexItem>
      )}
      {item.countryCode && (
        <EuiFlexItem grow={false}>
          <div
            css={css`
              display: flex;
              gap: ${euiTheme.size.xs};
            `}
          >
            <Flag countryCode={item.countryCode} countryName={'TBD: Country Name'} />
          </div>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
