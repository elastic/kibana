/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TakeActionButton } from './take_action_button';
import { TestProviders } from '../../../../common/mock';
import { mockContextValue } from '../mocks/mock_context';
import { DocumentDetailsContext } from '../context';
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from './test_ids';
import { useKibana } from '../../../../common/lib/kibana';
import { useAlertExceptionActions } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useAddToCaseActions } from '../../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';

vi.mock('../../../../common/lib/kibana');
vi.mock('react-router-dom', () => {
  const original = require('react-router-dom');
  return {
    ...original,
    useLocation: vi.fn().mockReturnValue({ search: '' }),
  };
});
vi.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions'
);
vi.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);
vi.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions'
);

describe('TakeActionButton', () => {
  it('should render the take action button', () => {
    (useKibana as Mock).mockReturnValue({
      services: {
        osquery: { isOsqueryAvailable: vi.fn() },
        cases: { hooks: { useIsAddToCaseOpen: vi.fn().mockReturnValue(false) } },
      },
    });
    (useAlertExceptionActions as Mock).mockReturnValue({ exceptionActionItems: [] });
    (useInvestigateInTimeline as Mock).mockReturnValue({
      investigateInTimelineActionItems: [{ name: 'test', onClick: vi.fn() }],
    });
    (useAddToCaseActions as Mock).mockReturnValue({ addToCaseActionItems: [] });

    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={mockContextValue}>
          <TakeActionButton />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render the take action button if dataAsNestedObject is null', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider
          value={{ ...mockContextValue, dataAsNestedObject: null as unknown as Ecs }}
        >
          <TakeActionButton />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(queryByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
