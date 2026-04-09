/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { EuiTourStep, EuiText, EuiButtonEmpty, EuiButton } from '@elastic/eui';

const SKIP_KEY = 'ingestHub:welcomeTourSkipped';

export const WelcomeFlyoutTour: React.FC<{ children: ReactElement }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem(SKIP_KEY) !== 'true');

  const dismiss = useCallback((permanently: boolean) => {
    if (permanently) localStorage.setItem(SKIP_KEY, 'true');
    setIsOpen(false);
  }, []);

  return (
    <EuiTourStep
      isStepOpen={isOpen}
      step={1}
      stepsTotal={1}
      subtitle="Prototype tour — for demo purposes only"
      title="Welcome to Elastic Observability"
      anchorPosition="downCenter"
      maxWidth={360}
      content={
        <EuiText size="s">
          <p>
            This flyout is your starting point. Browse integrations by cloud provider, container
            platform, host OS, or application. Click any card to view setup details, requirements,
            and available sources — then connect data directly from here.
          </p>
        </EuiText>
      }
      onFinish={() => dismiss(false)}
      footerAction={[
        <EuiButtonEmpty size="s" color="text" flush="left" onClick={() => dismiss(true)}>
          Skip all times
        </EuiButtonEmpty>,
        <EuiButton size="s" color="success" fill onClick={() => dismiss(false)}>
          Next
        </EuiButton>,
      ]}
    >
      {children}
    </EuiTourStep>
  );
};
