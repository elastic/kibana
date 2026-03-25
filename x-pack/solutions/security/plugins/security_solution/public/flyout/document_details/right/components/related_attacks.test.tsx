/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import {
  CORRELATIONS_RELATED_ATTACKS_TEST_ID,
  SUMMARY_ROW_BUTTON_TEST_ID,
  SUMMARY_ROW_TEXT_TEST_ID,
} from './test_ids';
import { RelatedAttacks } from './related_attacks';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';

const mockNavigateToLeftPanel = jest.fn();
jest.mock('../../shared/hooks/use_navigate_to_left_panel');

const TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(CORRELATIONS_RELATED_ATTACKS_TEST_ID);
const BUTTON_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(CORRELATIONS_RELATED_ATTACKS_TEST_ID);

const renderRelatedAttacks = (attackIds: string[]) =>
  render(
    <IntlProvider locale="en">
      <RelatedAttacks attackIds={attackIds} />
    </IntlProvider>
  );

describe('<RelatedAttacks />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigateToLeftPanel as jest.Mock).mockReturnValue(mockNavigateToLeftPanel);
  });

  it('should render singular label for one attack', () => {
    const { getByTestId } = renderRelatedAttacks(['attack-1']);
    expect(getByTestId(TEXT_TEST_ID)).toHaveTextContent('Attack related to this alert');
    expect(getByTestId(BUTTON_TEST_ID)).toHaveTextContent('1');
  });

  it('should render plural label for multiple attacks', () => {
    const { getByTestId } = renderRelatedAttacks(['attack-1', 'attack-2', 'attack-3']);
    expect(getByTestId(TEXT_TEST_ID)).toHaveTextContent('Attacks related to this alert');
    expect(getByTestId(BUTTON_TEST_ID)).toHaveTextContent('3');
  });

  it('should render zero attacks', () => {
    const { getByTestId } = renderRelatedAttacks([]);
    expect(getByTestId(TEXT_TEST_ID)).toHaveTextContent('Attacks related to this alert');
    expect(getByTestId(BUTTON_TEST_ID)).toHaveTextContent('0');
  });

  it('should navigate to left panel correlations tab when the count is clicked', () => {
    const { getByTestId } = renderRelatedAttacks(['attack-1']);
    getByTestId(BUTTON_TEST_ID).click();
    expect(mockNavigateToLeftPanel).toHaveBeenCalled();
  });
});
