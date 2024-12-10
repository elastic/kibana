/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../mocks/story_providers';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorsFlyoutOverview } from './overview_tab';
import { IndicatorsFiltersContext } from '../../hooks/use_filters_context';
import { IndicatorsFlyoutContext } from '../../hooks/use_flyout_context';

export default {
  component: IndicatorsFlyoutOverview,
  title: 'IndicatorsFlyoutOverview',
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
};

export const Default: Story<void> = () => {
  const mockIndicator: Indicator = generateMockIndicator();
  const context = {
    kqlBarIntegration: false,
  };

  return (
    <StoryProvidersComponent>
      <IndicatorsFiltersContext.Provider value={{} as any}>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorsFlyoutOverview onViewAllFieldsInTable={() => {}} indicator={mockIndicator} />
        </IndicatorsFlyoutContext.Provider>
      </IndicatorsFiltersContext.Provider>
    </StoryProvidersComponent>
  );
};
