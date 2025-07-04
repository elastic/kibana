/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { isEmpty } from 'lodash/fp';
import { EuiToolTip } from '@elastic/eui';
import countries from 'i18n-iso-countries';
import countryJson from 'i18n-iso-countries/langs/en.json';
import styled from '@emotion/styled';

// Fixes vertical alignment of the flag
const FlagWrapper = styled.span`
  position: relative;
  top: 1px;
`;

/**
 * Returns the flag for the specified country code, or null if the specified
 * country code could not be converted
 * Example: `US` -> 🇺🇸
 */
export const getFlag = (countryCode: string): string | null =>
  countryCode && countryCode.length === 2
    ? countryCode
        .toUpperCase()
        .replace(/./g, (c) => String.fromCharCode(55356, 56741 + c.charCodeAt(0)))
    : null;

/** Renders an emoji flag for the specified country code */
export const CountryFlag = memo<{
  countryCode: string;
  displayCountryNameOnHover?: boolean;
}>(({ countryCode, displayCountryNameOnHover = false }) => {
  useEffect(() => {
    if (displayCountryNameOnHover && isEmpty(countries.getNames('en'))) {
      countries.registerLocale(countryJson);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const flag = getFlag(countryCode);

  if (flag !== null) {
    return displayCountryNameOnHover ? (
      <EuiToolTip position="top" content={countries.getName(countryCode, 'en')}>
        <FlagWrapper data-test-subj="country-flag">{flag}</FlagWrapper>
      </EuiToolTip>
    ) : (
      <FlagWrapper data-test-subj="country-flag">{flag}</FlagWrapper>
    );
  }
  return null;
});

CountryFlag.displayName = 'CountryFlag';

/** Renders an emoji flag with country name for the specified country code */
export const CountryFlagAndName = memo<{
  countryCode: string;
  displayCountryNameOnHover?: boolean;
}>(({ countryCode, displayCountryNameOnHover = false }) => {
  const [localesLoaded, setLocalesLoaded] = useState(false);
  useEffect(() => {
    if (isEmpty(countries.getNames('en'))) {
      countries.registerLocale(countryJson);
    }
    setLocalesLoaded(true);
  }, []);

  const flag = getFlag(countryCode);

  if (flag !== null && localesLoaded) {
    return displayCountryNameOnHover ? (
      <EuiToolTip position="top" content={countries.getName(countryCode, 'en')}>
        <FlagWrapper data-test-subj="country-flag">{flag}</FlagWrapper>
      </EuiToolTip>
    ) : (
      <>
        <FlagWrapper data-test-subj="country-flag">{flag}</FlagWrapper>
        {` ${countries.getName(countryCode, 'en')}`}
      </>
    );
  }
  return null;
});

CountryFlagAndName.displayName = 'CountryFlagAndName';
