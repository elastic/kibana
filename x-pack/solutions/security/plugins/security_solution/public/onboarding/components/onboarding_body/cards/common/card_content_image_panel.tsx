/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { OnboardingCardContentPanel } from './card_content_panel';
import { useCardContentImagePanelStyles } from './card_content_image_panel.styles';

export const OnboardingCardContentImagePanel = React.memo<
  PropsWithChildren<{ imageSrc: string; imageAlt: string }>
>(({ children, imageSrc, imageAlt }) => {
  const styles = useCardContentImagePanelStyles();
  return (
    <OnboardingCardContentPanel className={styles}>
      <EuiFlexGroup direction="row" justifyContent="spaceBetween" gutterSize="none">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem className="cardSpacer" grow={false}>
          <EuiSpacer size="xl" />
        </EuiFlexItem>
        <EuiFlexItem className="cardImage" grow={false}>
          <img src={imageSrc} alt={imageAlt} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentPanel>
  );
});
OnboardingCardContentImagePanel.displayName = 'OnboardingCardContentImagePanel';
