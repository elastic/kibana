/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexItem, EuiText, useEuiFontSize, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  useNodeDetailsPopover,
  type UseNodeDetailsPopoverReturn,
} from '../../popovers/details/use_node_details_popover';
import {
  GRAPH_FLAGS_BADGE_ID,
  GRAPH_FLAGS_PLUS_COUNT_ID,
  GRAPH_FLAGS_VISIBLE_FLAG_ID,
  GRAPH_FLAGS_POPOVER_CONTENT_ID,
  GRAPH_FLAGS_POPOVER_COUNTRY_ID,
  GRAPH_FLAGS_POPOVER_ID,
  GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID,
} from '../../test_ids';
import { RoundedBadge } from '../styles';
import { getCountryFlag, getCountryName } from './country_codes';

const VISIBLE_FLAGS_LIMIT = 2;

/**
 * Filters out invalid country codes that don't have corresponding flags
 */
const getValidCountryCodes = (countryCodes: string[]): string[] => {
  return countryCodes.filter((code) => getCountryFlag(code) !== null);
};

const popoverAriaLabel = i18n.translate(
  'securitySolutionPackages.csp.graph.countryFlags.popoverAriaLabel',
  {
    defaultMessage: 'Country flags popover',
  }
);

export type UseCountryFlagsPopoverReturn = UseNodeDetailsPopoverReturn & {
  onCountryClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const useCountryFlagsPopover = (countryCodes: string[]): UseCountryFlagsPopoverReturn => {
  const validCodes = getValidCountryCodes(countryCodes);

  const items = validCodes.map((countryCode, index) => ({
    key: `${index}-${countryCode}`,
    label: `${getCountryFlag(countryCode)} ${getCountryName(countryCode)}`,
  }));

  const { id, onClick, PopoverComponent, actions, state } = useNodeDetailsPopover({
    popoverId: 'country-flags-popover',
    items,
    contentTestSubj: GRAPH_FLAGS_POPOVER_CONTENT_ID,
    itemTestSubj: GRAPH_FLAGS_POPOVER_COUNTRY_ID,
    popoverTestSubj: GRAPH_FLAGS_POPOVER_ID,
  });

  return {
    id,
    onCountryClick: onClick,
    PopoverComponent,
    actions,
    state,
    onClick,
  };
};

export interface CountryFlagsProps {
  countryCodes: string[];
  onCountryClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const CountryFlags = memo(({ countryCodes, onCountryClick }: CountryFlagsProps) => {
  const validCodes = getValidCountryCodes(countryCodes);
  const xsFontSize = useEuiFontSize('xs');

  if (validCodes.length === 0) {
    return null;
  }

  const visibleFlags = validCodes.slice(0, VISIBLE_FLAGS_LIMIT).map((countryCode) => {
    const flag = getCountryFlag(countryCode);
    return flag ? (
      <EuiFlexItem grow={false} key={countryCode} data-test-subj={GRAPH_FLAGS_VISIBLE_FLAG_ID}>
        {flag}
      </EuiFlexItem>
    ) : null;
  });

  const counter =
    validCodes.length > VISIBLE_FLAGS_LIMIT ? (
      onCountryClick ? (
        <EuiButtonEmpty
          size="xs"
          color="text"
          data-test-subj={GRAPH_FLAGS_PLUS_COUNT_BUTTON_ID}
          onClick={onCountryClick}
          aria-label={popoverAriaLabel}
          flush="both"
          css={css`
            font-weight: medium;
          `}
        >
          {'+'}
          {validCodes.length - VISIBLE_FLAGS_LIMIT}
        </EuiButtonEmpty>
      ) : (
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj={GRAPH_FLAGS_PLUS_COUNT_ID}
          css={css`
            font-weight: medium;
            ${xsFontSize};
          `}
        >
          {'+'}
          {validCodes.length - VISIBLE_FLAGS_LIMIT}
        </EuiText>
      )
    ) : null;

  return (
    <RoundedBadge data-test-subj={GRAPH_FLAGS_BADGE_ID}>
      {visibleFlags}
      {counter}
    </RoundedBadge>
  );
});

CountryFlags.displayName = 'CountryFlags';
