/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { EuiPanel, type EuiPanelProps } from '@elastic/eui';
import classnames from 'classnames';
import { useCardContentPanelStyles, NESTED_PANEL_CLASS_NAME } from './card_content_panel.styles';

export const OnboardingCardContentPanel = React.memo<PropsWithChildren<EuiPanelProps>>(
  ({ children, className, ...panelProps }) => {
    const styles = useCardContentPanelStyles();
    const panelClassName = classnames(styles);
    const nestedClassName = classnames(NESTED_PANEL_CLASS_NAME, className);

    return (
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false} className={panelClassName}>
        <EuiPanel hasShadow={false} paddingSize="l" {...panelProps} className={nestedClassName}>
          {children}
        </EuiPanel>
      </EuiPanel>
    );
  }
);
OnboardingCardContentPanel.displayName = 'OnboardingCardContentWrapper';
