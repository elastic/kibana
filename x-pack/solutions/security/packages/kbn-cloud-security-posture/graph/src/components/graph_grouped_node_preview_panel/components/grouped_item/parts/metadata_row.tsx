/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getCountryName, getCountryFlag } from '../../../../node/country_flags/country_codes';
import { GROUPED_ITEM_IP_TEST_ID, GROUPED_ITEM_GEO_TEST_ID } from '../../../test_ids';
import type { EntityOrEventItem } from '../types';
import { i18nNamespaceKey } from '../utils';

const geoLabel = i18n.translate(`${i18nNamespaceKey}.geoLabel`, {
  defaultMessage: 'Geo',
});

/* Helper components */

const CountryFlag = ({ countryCode }: { countryCode?: string }) => {
  const { euiTheme } = useEuiTheme();

  if (!countryCode) return null;

  const countryFlag = getCountryFlag(countryCode);
  const countryName = getCountryName(countryCode);

  if (!countryFlag || !countryName) return null;

  return (
    <div
      data-test-subj={GROUPED_ITEM_GEO_TEST_ID}
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
        {geoLabel}
      </EuiText>

      {/* NOTE: Wrap emoji flag with spaces for screen readers */}
      <EuiText
        size="s"
        css={css`
          position: relative;
          top: 1px;
        `}
      >{` ${countryFlag} `}</EuiText>

      <EuiText
        size="s"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {countryName}
      </EuiText>
    </div>
  );
};

/* Main implementation */

export interface MetadataRowProps {
  item: EntityOrEventItem;
}

export const MetadataRow = ({ item }: MetadataRowProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup wrap gutterSize="m" responsive={false} alignItems="center" direction="row">
      {item.ip && (
        <EuiFlexItem grow={false}>
          <div
            data-test-subj={GROUPED_ITEM_IP_TEST_ID}
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
              {'IP: '}
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
            <CountryFlag countryCode={item.countryCode} />
          </div>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
