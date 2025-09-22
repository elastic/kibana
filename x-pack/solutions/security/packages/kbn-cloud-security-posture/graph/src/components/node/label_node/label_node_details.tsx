/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { Ips } from '../ips/ips';
import { CountryFlags } from '../country_flags/country_flags';

export interface LabelNodeDetailsProps {
  ips?: string[];
  countryCodes?: string[];
}

export const LabelNodeDetails = ({ ips, countryCodes }: LabelNodeDetailsProps) => {
  const { euiTheme } = useEuiTheme();
  const shouldRenderIps = ips && ips.length > 0;
  const shouldRenderCountryFlags = countryCodes && countryCodes.length > 0;
  return shouldRenderIps || shouldRenderCountryFlags ? (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: ${euiTheme.size.xxs};
        margin-top: ${euiTheme.size.xs};
      `}
    >
      {shouldRenderIps && <Ips ips={ips} />}
      {shouldRenderCountryFlags && <CountryFlags countryCodes={countryCodes} />}
    </div>
  ) : null;
};
