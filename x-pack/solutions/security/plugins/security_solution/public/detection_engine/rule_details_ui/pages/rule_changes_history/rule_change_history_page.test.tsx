/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { RuleChangesHistoryPage } from './rule_change_history_page';
import { useRuleWithFallback } from '../../../rule_management/logic/use_rule_with_fallback';
import { RuleChangesHistoryEventTypes } from '../../../../common/lib/telemetry/events/rule_changes_history/types';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';
import { TestProviders } from '../../../../common/mock';

vi.mock('../../../rule_management/logic/use_rule_with_fallback');
const mockUseParams = vi.fn().mockReturnValue({ ruleId: 'rule-1' });
vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useParams: () => mockUseParams(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/utils/route/spy_routes', () => {
      const mocked = { SpyRoute: () => null };
      return { ...mocked, default: mocked };
    });

vi.mock('../../components/changes_history', () => {
      const mocked = {
      RuleChangesHistory: () => <div data-test-subj="mockRuleChangesHistory" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./rule_change_history_page_header', () => {
      const mocked = {
      RuleChangesHistoryPageHeader: () => <div data-test-subj="mockRuleChangesHistoryPageHeader" />,
    };
      return { ...mocked, default: mocked };
    });

const mockedTelemetry = createTelemetryServiceMock();
vi.mock('../../../../common/lib/kibana', async () => {
  const original = (await vi.importActual('../../../../common/lib/kibana'));

  return {
    ...original,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

const mockUseRuleWithFallback = useRuleWithFallback as Mock;

describe('RuleChangesHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRuleWithFallback.mockReturnValue({ rule: undefined });
    mockUseParams.mockReturnValue({ ruleId: 'rule-1' });
  });

  describe('telemetry', () => {
    it('fires ChangesHistoryViewed exactly once on mount with an empty payload', async () => {
      render(
        <TestProviders>
          <RuleChangesHistoryPage />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockedTelemetry.reportEvent).toHaveBeenCalledWith(
          RuleChangesHistoryEventTypes.ChangesHistoryViewed,
          {}
        );
      });

      expect(mockedTelemetry.reportEvent).toHaveBeenCalledTimes(1);
    });

    it('does not fire additional ChangesHistoryViewed events on re-render without unmount', async () => {
      const { rerender } = render(
        <TestProviders>
          <RuleChangesHistoryPage />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockedTelemetry.reportEvent).toHaveBeenCalledTimes(1);
      });

      rerender(
        <TestProviders>
          <RuleChangesHistoryPage />
        </TestProviders>
      );

      expect(mockedTelemetry.reportEvent).toHaveBeenCalledTimes(1);
    });
  });
});
