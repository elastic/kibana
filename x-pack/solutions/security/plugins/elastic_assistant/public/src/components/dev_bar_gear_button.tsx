/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiTitle,
  EuiSpacer,
  EuiButtonGroup,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiSwitchEvent,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { useAssistantNavDevSingleton } from '../context/assistant_nav_dev_singleton';

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

export const DevBarGearButton: React.FC = () => {
  const { chrome } = useAssistantContext();
  const [chromeStyle, setChromeStyle] = useState<ChromeStyle | undefined>(undefined);
  const { variant, iconOnly, isDevBarOpen, setVariant, setIconOnly, toggleDevBar } =
    useAssistantNavDevSingleton();

  useEffect(() => {
    const s = chrome.getChromeStyle$().subscribe(setChromeStyle);
    return () => s.unsubscribe();
  }, [chrome]);

  const handleVariantChange = (optionId: string) => {
    setVariant(optionId as VariantType);
  };

  const handleIconOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIconOnly(e.target.checked);
  };

  const button = (
    <EuiButtonIcon
      iconType="gear"
      onClick={toggleDevBar}
      aria-label="Open assistant dev controls"
      color="text"
      size="m"
      css={[
        { marginLeft: '-4px' },
        chromeStyle === 'classic' && css`
          color: white !important;
          &:hover {
            color: white !important;
          }
        `
      ]}
    />
  );

  return (
    <EuiPopover
      id="assistantDevBarPopover"
      button={button}
      isOpen={isDevBarOpen}
      closePopover={() => toggleDevBar()}
      anchorPosition="downLeft"
      panelStyle={{ width: '300px' }}
    >
      <EuiTitle size="xs">
        <h3>Agent button settings</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>Variant</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiButtonGroup
            legend="Choose variant"
            options={variantOptions}
            idSelected={variant}
            onChange={handleVariantChange}
            buttonSize="compressed"
            isFullWidth
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSwitch
            label="Icon only"
            checked={iconOnly}
            onChange={handleIconOnlyChange}
            compressed
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <p>
              Current: variant="{variant}" iconOnly={iconOnly ? 'true' : 'false'}
            <br />Controls the Elastic Agent button →</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
