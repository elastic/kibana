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
import { i18nNamespaceKey } from '../../../constants';

const geoLabel = i18n.translate(`${i18nNamespaceKey}.groupedItem.geoLabel`, {
  defaultMessage: 'Geo',
});

/* Helper functions */

/**
 * Gets the first non-empty element from an array of strings.
 * Returns undefined if the array is empty, undefined, or contains only empty strings.
 */
const getFirstElement = (values?: string[]): string | undefined => {
  if (!values || values.length === 0) return undefined;
  const firstNonEmpty = values.find((val) => val && val.trim() !== '');
  return firstNonEmpty || undefined;
};

/* Helper components */

const VerticalSeparator = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        width: 1px;
        height: 14px;
        background-color: ${euiTheme.colors.borderBaseSubdued};
      `}
    />
  );
};

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
        {`${geoLabel}: `}
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
  const normalizedIp = getFirstElement(item.ips);
  const normalizedCountryCode = getFirstElement(item.countryCodes);

  return (
    <EuiFlexGroup wrap gutterSize="s" responsive={false} alignItems="center" direction="row">
      {normalizedIp && (
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
              {normalizedIp}
            </EuiText>
          </div>
        </EuiFlexItem>
      )}

      {normalizedIp && normalizedCountryCode && (
        <EuiFlexItem grow={false}>
          <VerticalSeparator />
        </EuiFlexItem>
      )}

      {normalizedCountryCode && (
        <EuiFlexItem grow={false}>
          <div
            css={css`
              display: flex;
              gap: ${euiTheme.size.xs};
            `}
          >
            <CountryFlag countryCode={normalizedCountryCode} />
          </div>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
