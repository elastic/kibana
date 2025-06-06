/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { LineToolTipContentComponent } from './line_tool_tip_content';
import {
  SUM_OF_CLIENT_BYTES,
  SUM_OF_DESTINATION_BYTES,
  SUM_OF_SERVER_BYTES,
  SUM_OF_SOURCE_BYTES,
} from '../map_config';
import type { ITooltipProperty } from '@kbn/maps-plugin/public/classes/tooltips/tooltip_property';
import { TooltipProperty } from '@kbn/maps-plugin/public/classes/tooltips/tooltip_property';
import { TestProviders } from '../../../../../common/mock';

describe('LineToolTipContent', () => {
  const mockFeatureProps: ITooltipProperty[] = [
    new TooltipProperty(SUM_OF_DESTINATION_BYTES, SUM_OF_DESTINATION_BYTES, 'testPropValue'),
    new TooltipProperty(SUM_OF_SOURCE_BYTES, SUM_OF_SOURCE_BYTES, 'testPropValue'),
  ];

  const mockClientServerFeatureProps: ITooltipProperty[] = [
    new TooltipProperty(SUM_OF_SERVER_BYTES, SUM_OF_SERVER_BYTES, 'testPropValue'),
    new TooltipProperty(SUM_OF_CLIENT_BYTES, SUM_OF_CLIENT_BYTES, 'testPropValue'),
  ];

  test('renders correctly against snapshot', () => {
    const { container } = render(
      <TestProviders>
        <LineToolTipContentComponent contextId={'contextId'} featureProps={mockFeatureProps} />
      </TestProviders>
    );
    expect(container.children[0]).toMatchSnapshot();
  });

  test('renders correctly against snapshot when rendering client & server', () => {
    const { container } = render(
      <TestProviders>
        <LineToolTipContentComponent
          contextId={'contextId'}
          featureProps={mockClientServerFeatureProps}
        />
      </TestProviders>
    );
    expect(container.children[0]).toMatchSnapshot();
  });
});
