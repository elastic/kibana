/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  EmptyResultsFooter,
  LEARN_MORE_LINK_DATA_TEST_ID,
  EMPTY_RESULTS_FOOTER_MESSAGE_ID,
} from './footer';
import * as i18n from './translations';

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('EmptyResultsFooter', () => {
  test('renders correctly', () => {
    const { getByTestId, getByText } = renderWithIntl(<EmptyResultsFooter />);

    expect(getByTestId(EMPTY_RESULTS_FOOTER_MESSAGE_ID)).toBeInTheDocument();
    expect(getByTestId(LEARN_MORE_LINK_DATA_TEST_ID)).toBeInTheDocument();
    expect(getByText(i18n.LEARN_MORE)).toBeInTheDocument();
    expect(getByTestId(LEARN_MORE_LINK_DATA_TEST_ID)).toHaveAttribute(
      'href',
      'https://www.elastic.co/guide/en/security/current/attack-discovery.html'
    );
  });
});
