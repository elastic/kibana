/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexItem, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getCountryFlag, getCountryName } from './country_codes';
import { RoundedBadge, ToolTipButton } from '../styles';

export const TEST_SUBJ_BADGE = 'country-flags-badge';
export const TEST_SUBJ_PLUS_COUNT = 'country-flags-plus-count';
export const TEST_SUBJ_TOOLTIP = 'country-flags-tooltip';
export const TEST_SUBJ_TOOLTIP_CONTENT = 'country-flags-tooltip-content';
export const TEST_SUBJ_TOOLTIP_COUNTRY = 'country-flags-tooltip-country';

export const MAX_COUNTRY_FLAGS_IN_TOOLTIP = 10;
const VISIBLE_FLAGS_LIMIT = 2;

const toolTipTitle = i18n.translate(
  'securitySolutionPackages.csp.graph.countryFlags.toolTipTitle',
  {
    defaultMessage: 'Geolocation',
  }
);

const openFlyoutText = i18n.translate(
  'securitySolutionPackages.csp.graph.countryFlags.countryFlagsOverLimit',
  {
    defaultMessage: 'Open full details in flyout',
  }
);

export interface CountryFlagsProps {
  countryCodes: string[];
}

export const CountryFlags = memo(({ countryCodes }: CountryFlagsProps) => {
  const { euiTheme } = useEuiTheme();

  const validCodes = countryCodes.filter((code) => getCountryFlag(code) !== null);

  if (validCodes.length === 0) {
    return null;
  }

  const toolTipContent =
    validCodes.length > VISIBLE_FLAGS_LIMIT ? (
      <ul data-test-subj={TEST_SUBJ_TOOLTIP_CONTENT}>
        {validCodes.slice(0, MAX_COUNTRY_FLAGS_IN_TOOLTIP).map((countryCode) => (
          <li data-test-subj={TEST_SUBJ_TOOLTIP_COUNTRY} key={countryCode}>
            <EuiText size="m">
              {getCountryFlag(countryCode)} {getCountryName(countryCode)}
            </EuiText>
          </li>
        ))}
        {validCodes.length > MAX_COUNTRY_FLAGS_IN_TOOLTIP ? (
          <>
            <li>
              <br />
            </li>
            <li>{openFlyoutText}</li>
          </>
        ) : null}
      </ul>
    ) : null;

  const visibleFlags = validCodes.slice(0, VISIBLE_FLAGS_LIMIT).map((countryCode) => {
    const flag = getCountryFlag(countryCode);
    return flag ? (
      <EuiFlexItem grow={false} key={countryCode}>
        {flag}
      </EuiFlexItem>
    ) : null;
  });

  const counter =
    validCodes.length > VISIBLE_FLAGS_LIMIT ? (
      <EuiText
        data-test-subj={TEST_SUBJ_PLUS_COUNT}
        size="xs"
        color="default"
        css={css`
          font-weight: medium;
        `}
      >
        {'+'}
        {validCodes.length - VISIBLE_FLAGS_LIMIT}
      </EuiText>
    ) : null;

  return (
    <EuiToolTip
      data-test-subj={TEST_SUBJ_TOOLTIP}
      title={toolTipTitle}
      position="right"
      content={toolTipContent}
    >
      {/* Wrap badge with button to make it focusable and open ToolTip with keyboard */}
      <ToolTipButton>
        <RoundedBadge data-test-subj={TEST_SUBJ_BADGE} euiTheme={euiTheme}>
          {visibleFlags}
          {counter}
        </RoundedBadge>
      </ToolTipButton>
    </EuiToolTip>
  );
});

CountryFlags.displayName = 'CountryFlags';
