/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { mockIndicatorsFiltersContext } from '../../../../mocks/mock_indicators_filters_context';
import { mockUiSettingsService } from '../../../../mocks/mock_kibana_ui_settings_service';
import { mockKibanaTimelinesService } from '../../../../mocks/mock_kibana_timelines_service';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { generateMockIndicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorsFlyoutTable } from './table_tab';
import { IndicatorsFiltersContext } from '../../hooks/use_filters_context';
import { IndicatorsFlyoutContext } from '../../hooks/use_flyout_context';

export default {
  component: IndicatorsFlyoutTable,
  title: 'IndicatorsFlyoutTable',
};
const context = {
  kqlBarIntegration: false,
};

export const Default: StoryFn = () => {
  const mockIndicator: Indicator = generateMockIndicator();
  const KibanaReactContext = createKibanaReactContext({
    uiSettings: mockUiSettingsService(),
    timelines: mockKibanaTimelinesService,
  } as unknown as CoreStart);

  return (
    <KibanaReactContext.Provider>
      <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorsFlyoutTable indicator={mockIndicator} />
        </IndicatorsFlyoutContext.Provider>
      </IndicatorsFiltersContext.Provider>
    </KibanaReactContext.Provider>
  );
};

export const EmptyIndicator: StoryFn = () => {
  return (
    <IndicatorsFlyoutContext.Provider value={context}>
      <IndicatorsFlyoutTable indicator={{ fields: {} } as unknown as Indicator} />
    </IndicatorsFlyoutContext.Provider>
  );
};
