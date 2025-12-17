/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { GRAPH_ENTITY_NODE_DETAILS_ID } from '../test_ids';
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
  onIpClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCountryClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const NodeDetails = ({
  count,
  tag,
  label,
  ips,
  countryCodes,
  onIpClick,
  onCountryClick,
}: NodeDetailsProps) => {
  const { euiTheme } = useEuiTheme();

  const shouldRenderTag = !!tag || (count && count > 1);
  const shouldRenderLabel = !!label;
  const shouldRenderIps = ips && ips.length > 0;
  const shouldRenderFlags = countryCodes && countryCodes.length > 0;

  const shouldRenderTop = shouldRenderTag;
  const shouldRenderBottom = shouldRenderLabel || shouldRenderIps || shouldRenderFlags;

  return (
    <EuiFlexGroup
      data-test-subj={GRAPH_ENTITY_NODE_DETAILS_ID}
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
          {shouldRenderIps ? <Ips ips={ips} onIpClick={onIpClick} /> : null}
          {shouldRenderFlags ? (
            <CountryFlags countryCodes={countryCodes} onCountryClick={onCountryClick} />
          ) : null}
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
