/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiButtonGroup,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AssistantOverlay } from '@kbn/elastic-assistant';
import { useAssistantNavDev } from '../context/assistant_nav_dev_context';

const devBarStyles = css`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid #d3dae6;
`;

type VariantType = 'primary' | 'secondary' | 'tertiary';

const variantOptions = [
  {
    id: 'primary',
    label: 'Primary',
  },
  {
    id: 'secondary',
    label: 'Secondary',
  },
  {
    id: 'tertiary',
    label: 'Tertiary',
  },
];

export const AssistantNavLinkDevBar: React.FC = () => {
  const { variant, iconOnly, setVariant, setIconOnly } = useAssistantNavDev();

  const handleVariantChange = (optionId: string) => {
    setVariant(optionId as VariantType);
  };

  const handleIconOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIconOnly(e.target.checked);
  };

  return (
    <>
      <EuiPanel css={devBarStyles} paddingSize="m">
        <EuiTitle size="xs">
          <h3>Assistant Nav Link Dev Bar</h3>
        </EuiTitle>
        
        <EuiSpacer size="m" />
        
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiText size="s">
              <strong>Variant</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiButtonGroup
              legend="Choose variant"
              options={variantOptions}
              idSelected={variant}
              onChange={handleVariantChange}
              buttonSize="s"
              isFullWidth
            />
          </EuiFlexItem>
          
          <EuiFlexItem>
            <EuiSwitch
              label="Icon only"
              checked={iconOnly}
              onChange={handleIconOnlyChange}
            />
          </EuiFlexItem>
          
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              <p>
                Current: variant="{variant}" iconOnly={iconOnly ? 'true' : 'false'}
              </p>
              <p>
                Controls the button in the nav bar ↗️
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      
      <Suspense fallback={null}>
        <AssistantOverlay />
      </Suspense>
    </>
  );
};
