/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../mocks/story_providers';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { generateMockIndicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorsFlyout } from './flyout';

export default {
  component: IndicatorsFlyout,
  title: 'IndicatorsFlyout',
};

export const Default: StoryFn = () => {
  const mockIndicator: Indicator = generateMockIndicator();

  return (
    <StoryProvidersComponent>
      <IndicatorsFlyout
        indicator={mockIndicator}
        closeFlyout={() => window.alert('Closing flyout')}
      />
    </StoryProvidersComponent>
  );
};

export const EmptyIndicator: StoryFn = () => {
  return (
    <StoryProvidersComponent>
      <IndicatorsFlyout
        indicator={{ fields: {} } as Indicator}
        closeFlyout={() => window.alert('Closing flyout')}
      />
    </StoryProvidersComponent>
  );
};
