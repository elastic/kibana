/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { RiskInformationButtonEmpty } from '.';
import { TestProviders } from '../../../common/mock';
import { RiskScoreEntity } from '../../../../common/search_strategy';

describe.each([RiskScoreEntity.host, RiskScoreEntity.user])(
  'Risk Information entityType: %s',
  (riskEntity) => {
    describe('RiskInformationButtonEmpty', () => {
      it('renders', () => {
        const { queryByTestId } = render(<RiskInformationButtonEmpty riskEntity={riskEntity} />);

        expect(queryByTestId('open-risk-information-flyout-trigger')).toBeInTheDocument();
      });

      it('opens and displays a risk levels table with 5 rows', () => {
        const NUMBER_OF_ROWS = 1 + 5; // 1 header row + 5 severity rows
        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <RiskInformationButtonEmpty riskEntity={riskEntity} />
          </TestProviders>
        );

        fireEvent.click(getByTestId('open-risk-information-flyout-trigger'));

        const riskLevelsTable = queryByTestId('risk-level-information-table');

        expect(riskLevelsTable).toBeInTheDocument();
        expect(within(riskLevelsTable!).queryAllByRole('row')).toHaveLength(NUMBER_OF_ROWS);
      });

      it('opens and displays an asset criticality tiers table with four (4) rows', () => {
        const NUMBER_OF_ROWS = 1 + 4; // 1 header row + 4 tier rows
        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <RiskInformationButtonEmpty riskEntity={riskEntity} />
          </TestProviders>
        );

        fireEvent.click(getByTestId('open-risk-information-flyout-trigger'));

        const criticalityTiersTable = queryByTestId('criticality-level-information-table');

        expect(criticalityTiersTable).toBeInTheDocument();
        expect(within(criticalityTiersTable!).queryAllByRole('row')).toHaveLength(NUMBER_OF_ROWS);
      });
    });
  }
);
