/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RuleCustomizationsFlyout } from './rule_customizations_flyout';
import { TestProviders } from '../../../../../common/mock';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';

jest.mock('../../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addWarning: jest.fn(),
  }),
}));

describe('RuleCustomizationsFlyout', () => {
  describe('concurrency control', () => {
    it('shows a callout if data is stale', () => {
      const currentRule = { ...getRulesSchemaMock(), name: 'current', revision: 1 };
      const baseRule = { ...getRulesSchemaMock(), name: 'base', revision: 1 };

      const { rerender, queryByTestId } = render(
        <TestProviders>
          <KibanaErrorBoundaryProvider analytics={undefined}>
            <RuleCustomizationsFlyout
              diff={{
                num_fields_with_updates: 0,
                num_fields_with_conflicts: 0,
                num_fields_with_non_solvable_conflicts: 0,
                fields: {},
              }}
              currentRule={currentRule}
              baseRule={baseRule}
              isReverting={false}
              closeFlyout={jest.fn()}
            />
          </KibanaErrorBoundaryProvider>
        </TestProviders>
      );

      expect(queryByTestId('ruleCustomizationsOutdatedCallout')).not.toBeInTheDocument();

      rerender(
        <TestProviders>
          <KibanaErrorBoundaryProvider analytics={undefined}>
            <RuleCustomizationsFlyout
              diff={{
                num_fields_with_updates: 0,
                num_fields_with_conflicts: 0,
                num_fields_with_non_solvable_conflicts: 0,
                fields: {},
              }}
              currentRule={{ ...currentRule, revision: 2 }}
              baseRule={baseRule}
              isReverting={false}
              closeFlyout={jest.fn()}
            />
          </KibanaErrorBoundaryProvider>
        </TestProviders>
      );

      expect(queryByTestId('ruleCustomizationsOutdatedCallout')).toBeInTheDocument();
    });
  });
});
