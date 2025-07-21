/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { Tag } from './tag/tag';
import { Ips } from './ips/ips';
import { CountryFlags } from './country_flags/country_flags';
import { Label } from './label/label';

interface NodeDetailsProps {
  count?: number;
  tag?: string;
  label?: string;
  ips?: string[];
  countryCodes?: string[];
}

export const NodeDetails = ({ count, tag, label, ips, countryCodes }: NodeDetailsProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      css={css`
        position: absolute;
        left: 50%;
        top: 100%;
        transform: translateX(-50%);
        white-space: nowrap;
      `}
    >
      <EuiFlexItem grow={false}>
        <Tag count={count} text={tag} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ alignItems: 'center', gap: euiTheme.size.xxs }}>
        {label && <Label text={label} />}
        {ips && ips.length > 0 && <Ips ips={ips} />}
        {countryCodes && countryCodes.length > 0 && <CountryFlags countryCodes={countryCodes} />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
