/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiStepsHorizontal, EuiStepsHorizontalProps } from '@elastic/eui';
import { css } from '@emotion/react';

interface DecorativeHorizontalStepperProps {
  stepCount?: number;
}

export const DecorativeHorizontalStepper: React.FC<DecorativeHorizontalStepperProps> = ({
  stepCount = 2,
}) => {
  // Generate the steps dynamically based on the stepCount prop
  const horizontalSteps: EuiStepsHorizontalProps['steps'] = Array.from(
    { length: stepCount },
    (_, index) => ({
      title: '',
      status: 'incomplete',
      onClick: () => {},
    })
  );

  return (
    /* This is a presentational component, not intended for user interaction:
    pointer-events: none, prevents user interaction with the component.
    inert prevents click, focus, and other interactive events, removing it from the tab order.
    role="presentation" indicates that this component is purely decorative and not interactive for assistive technologies.
    Together, these attributes help ensure the component is accesible. */
    <EuiStepsHorizontal
      css={css`
        pointer-events: none;
      `}
      steps={horizontalSteps}
      size="s"
      role="presentation"
      // @ts-ignore due to React 18 and TypeScript doesn't have native HTML inert attribute support yet
      inert=""
    />
  );
};
