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
import { generateMockFileIndicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorValueActions } from './indicator_value_actions';
import { IndicatorsFlyoutContext } from '../../hooks/use_flyout_context';

export default {
  title: 'IndicatorValueActions',
};

const indicator: Indicator = generateMockFileIndicator();
const field: string = 'threat.indicator.name';

export const Default: StoryFn = () => {
  const context = {
    kqlBarIntegration: true,
  };
  return (
    <StoryProvidersComponent>
      <IndicatorsFlyoutContext.Provider value={context}>
        <IndicatorValueActions indicator={indicator} field={field} />
      </IndicatorsFlyoutContext.Provider>
    </StoryProvidersComponent>
  );
};

export const WithoutFilterInOut: StoryFn = () => {
  const context = {
    kqlBarIntegration: false,
  };
  return (
    <StoryProvidersComponent>
      <IndicatorsFlyoutContext.Provider value={context}>
        <IndicatorValueActions indicator={indicator} field={field} />
      </IndicatorsFlyoutContext.Provider>
    </StoryProvidersComponent>
  );
};
