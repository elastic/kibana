/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { analyzeMagnifyGlass, monitorGraphCogs, smartFiltering } from '@elastic/eui-illustrations';
import { css } from '@emotion/react';
import React from 'react';
import {
  INVESTIGATES_DESCRIPTION,
  INVESTIGATES_TITLE,
  LEARNS_DESCRIPTION,
  LEARNS_TITLE,
  PRIORITIZES_DESCRIPTION,
  PRIORITIZES_TITLE,
} from './translations';

const EXPLAINER_ITEMS = [
  {
    illustration: monitorGraphCogs,
    title: LEARNS_TITLE,
    description: LEARNS_DESCRIPTION,
  },
  {
    illustration: smartFiltering,
    title: PRIORITIZES_TITLE,
    description: PRIORITIZES_DESCRIPTION,
  },
  {
    illustration: analyzeMagnifyGlass,
    title: INVESTIGATES_TITLE,
    description: INVESTIGATES_DESCRIPTION,
  },
] as const;

export const DetectionExplainer = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder data-test-subj="nightshiftDetectionExplainer">
      <EuiFlexGroup gutterSize="xl">
        {EXPLAINER_ITEMS.map(({ illustration, title, description }) => (
          <EuiFlexItem key={title}>
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIllustration
                  type={illustration}
                  alt=""
                  css={css`
                    max-inline-size: ${euiTheme.base * 5}px;
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h3>{title}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <p>{description}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
