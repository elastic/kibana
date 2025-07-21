/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiText, EuiToolTip, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import { NODE_TAG_HEIGHT } from '../styles';
import { getCountryFlag, getCountryName } from './country_codes';

const getGroupedCountryCodesByFrequency = (codes: string[]): Array<[string, number]> => {
  const frequencyMap: Record<string, number> = {};
  const firstAppearanceMap: Record<string, number> = {};

  // Count frequencies and track first appearances
  codes.forEach((code, index) => {
    const lowercaseCode = code.toLowerCase();
    frequencyMap[lowercaseCode] = (frequencyMap[lowercaseCode] || 0) + 1;
    if (firstAppearanceMap[lowercaseCode] === undefined) {
      firstAppearanceMap[lowercaseCode] = index;
    }
  });

  // Convert to array and sort by frequency (descending) and first appearance (ascending)
  return Object.entries(frequencyMap)
    .map(([code, count]) => [code, count] as [string, number])
    .sort((a, b) => {
      if (a[1] === b[1]) {
        return firstAppearanceMap[a[0]] - firstAppearanceMap[b[0]];
      }
      return b[1] - a[1];
    });
};

export const RoundedBadge = styled.div<{
  euiTheme: EuiThemeComputed;
}>`
  display: inline-flex;
  align-items: center;

  height: ${NODE_TAG_HEIGHT}px;
  padding: ${({ euiTheme }) => `${euiTheme.size.xxs} ${euiTheme.size.xs}`};
  gap: ${({ euiTheme }) => euiTheme.size.xxs};

  background-color: ${({ euiTheme }) => euiTheme.colors.backgroundBasePlain};
  border: ${({ euiTheme }) => euiTheme.border.thin};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.small};

  font-weight: ${({ euiTheme }) => euiTheme.font.weight.bold};
`;

export interface CountryFlagsProps {
  countryCodes: string[];
}

const VISIBLE_FLAGS_LIMIT = 2;

const toolTipTitle = i18n.translate('xpack.cloudSecurityPosture.countryFlags.toolTipTitle', {
  defaultMessage: 'Geolocation',
});

export const CountryFlags = ({ countryCodes }: CountryFlagsProps) => {
  const { euiTheme } = useEuiTheme();
  if (!countryCodes) {
    return null;
  }

  const filteredCountryCodes = countryCodes.filter((code) => getCountryFlag(code) !== null);
  const groupedCodes = getGroupedCountryCodesByFrequency(filteredCountryCodes);

  return (
    <EuiToolTip
      data-test-subj="country-flags-tooltip"
      title={toolTipTitle}
      position="right"
      content={
        groupedCodes.length > VISIBLE_FLAGS_LIMIT ? (
          <ul data-test-subj="country-flags-tooltip-content">
            {groupedCodes.map(([countryCode]) => (
              <li key={countryCode}>
                <EuiText size="m">
                  {getCountryFlag(countryCode)} {getCountryName(countryCode)}
                </EuiText>
              </li>
            ))}
          </ul>
        ) : null
      }
    >
      <RoundedBadge data-test-subj="country-flags-badge" euiTheme={euiTheme}>
        {groupedCodes.slice(0, VISIBLE_FLAGS_LIMIT).map(([countryCode]) => {
          const flag = getCountryFlag(countryCode);
          return flag ? (
            <EuiFlexItem grow={false} key={countryCode}>
              {flag}
            </EuiFlexItem>
          ) : null;
        })}
        {groupedCodes.length > VISIBLE_FLAGS_LIMIT ? (
          <EuiText
            data-test-subj="country-flags-plus-count"
            size="xs"
            css={css`
              font-weight: medium;
            `}
          >
            {'+'}
            {groupedCodes.length - VISIBLE_FLAGS_LIMIT}
          </EuiText>
        ) : null}
      </RoundedBadge>
    </EuiToolTip>
  );
};
