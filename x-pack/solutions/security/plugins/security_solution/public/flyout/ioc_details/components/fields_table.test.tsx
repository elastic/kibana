/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { IndicatorEmptyPrompt } from './empty_prompt';

describe('IndicatorEmptyPrompt', () => {
  it('should render component', () => {
    const { getByText } = render(
      <I18nProvider>
        <IndicatorEmptyPrompt />
      </I18nProvider>
    );

    expect(getByText('Unable to display indicator information')).toBeInTheDocument();
    expect(
      getByText('There was an error displaying the indicator fields and values.')
    ).toBeInTheDocument();
  });
});
