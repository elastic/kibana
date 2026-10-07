/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { Ips } from '../ips/ips';
import { CountryFlags } from '../country_flags/country_flags';
import { NODE_LABEL_WIDTH } from '../styles';

export interface LabelNodeDetailsProps {
  ips?: string[];
  countryCodes?: string[];
  onIpClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCountryClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const LabelNodeDetails = ({
  ips,
  countryCodes,
  onIpClick,
  onCountryClick,
}: LabelNodeDetailsProps) => {
  const { euiTheme } = useEuiTheme();
  const shouldRenderIps = ips && ips.length > 0;
  const shouldRenderCountryFlags = countryCodes && countryCodes.length > 0;
  return shouldRenderIps || shouldRenderCountryFlags ? (
    <EuiFlexGroup
      justifyContent="center"
      alignItems="center"
      gutterSize="s"
      responsive={false}
      wrap={false}
      css={css`
        width: ${NODE_LABEL_WIDTH}px;
        margin-top: ${euiTheme.size.xs};
      `}
    >
      {shouldRenderIps && (
        <EuiFlexItem grow={false}>
          <Ips ips={ips} onIpClick={onIpClick} />
        </EuiFlexItem>
      )}
      {shouldRenderCountryFlags && (
        <EuiFlexItem grow={false}>
          <CountryFlags countryCodes={countryCodes} onCountryClick={onCountryClick} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ) : null;
};
