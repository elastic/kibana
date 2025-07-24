/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiText, EuiToolTip, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
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

  // Sort by frequency (descending) and first appearance (ascending)
  return Object.entries(frequencyMap).sort((a, b) => {
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

  height: 20px;
  padding: ${({ euiTheme }) => `${euiTheme.size.xxs} ${euiTheme.size.xs}`};
  gap: ${({ euiTheme }) => euiTheme.size.xxs};

  background-color: ${({ euiTheme }) => euiTheme.colors.backgroundBasePlain};
  border: ${({ euiTheme }) => euiTheme.border.thin};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.small};

  font-weight: ${({ euiTheme }) => euiTheme.font.weight.bold};
`;

export interface CountryFlagsProps {
  countryCodes?: string[];
}

const VISIBLE_FLAGS_LIMIT = 2;

const toolTipTitle = i18n.translate(
  'securitySolutionPackages.csp.graph.countryFlags.toolTipTitle',
  {
    defaultMessage: 'Geolocation',
  }
);

export const CountryFlags = ({ countryCodes }: CountryFlagsProps) => {
  const { euiTheme } = useEuiTheme();

  const groupedCodes = useMemo(() => {
    // Prevent from null or undefined input
    const countryCodesArr = countryCodes === null || countryCodes === undefined ? [] : countryCodes;
    const filteredCountryCodes = countryCodesArr.filter((code) => getCountryFlag(code) !== null);
    return getGroupedCountryCodesByFrequency(filteredCountryCodes);
  }, [countryCodes]);

  const toolTipContent = useMemo(
    () =>
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
      ) : null,
    [groupedCodes]
  );

  const visibleFlags = useMemo(
    () =>
      groupedCodes.slice(0, VISIBLE_FLAGS_LIMIT).map(([countryCode]) => {
        const flag = getCountryFlag(countryCode);
        return flag ? (
          <EuiFlexItem grow={false} key={countryCode}>
            {flag}
          </EuiFlexItem>
        ) : null;
      }),
    [groupedCodes]
  );

  return (
    <EuiToolTip
      data-test-subj="country-flags-tooltip"
      title={toolTipTitle}
      position="right"
      content={toolTipContent}
    >
      <RoundedBadge data-test-subj="country-flags-badge" euiTheme={euiTheme}>
        {visibleFlags}
        {groupedCodes.length > VISIBLE_FLAGS_LIMIT ? (
          <EuiText
            data-test-subj="country-flags-plus-count"
            size="xs"
            css={css`
              font-weight: medium;
            `}
          >
            {'+'}{groupedCodes.length - VISIBLE_FLAGS_LIMIT}
          </EuiText>
        ) : null}
      </RoundedBadge>
    </EuiToolTip>
  );
};