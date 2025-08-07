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

  const shouldRenderTag = !!tag || (count && count > 1);
  const shouldRenderLabel = !!label;
  const shouldRenderIps = ips && ips.length > 0;
  const shouldRenderFlags = countryCodes && countryCodes.length > 0;

  const shouldRenderTop = shouldRenderTag;
  const shouldRenderBottom = shouldRenderLabel || shouldRenderIps || shouldRenderFlags;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize={shouldRenderTop && shouldRenderBottom ? 's' : 'none'}
      css={css`
        white-space: nowrap;
      `}
    >
      {shouldRenderTop ? (
        <EuiFlexItem grow={false}>
          {shouldRenderTag ? <Tag count={count} text={tag} /> : null}
        </EuiFlexItem>
      ) : null}
      {shouldRenderBottom ? (
        <EuiFlexItem grow={false} css={{ alignItems: 'center', gap: euiTheme.size.xxs }}>
          {shouldRenderLabel ? <Label text={label} /> : null}
          {shouldRenderIps ? <Ips ips={ips} /> : null}
          {shouldRenderFlags ? <CountryFlags countryCodes={countryCodes} /> : null}
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
