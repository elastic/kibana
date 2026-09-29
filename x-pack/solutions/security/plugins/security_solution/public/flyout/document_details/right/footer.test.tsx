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
import { PanelFooter } from './footer';
import { TestProviders } from '../../../common/mock';
import { mockContextValue } from '../shared/mocks/mock_context';
import { DocumentDetailsContext } from '../shared/context';
import { FLYOUT_FOOTER_TEST_ID } from './test_ids';
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from '../shared/components/test_ids';
import { useKibana } from '../../../common/lib/kibana';
import { useInvestigateInTimeline } from '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { FooterAiActions } from '../../../flyout_v2/document/main/components/footer_ai_actions';

vi.mock('../../../common/lib/kibana');
vi.mock('../../../flyout_v2/document/main/components/footer_ai_actions', () => {
      const mocked = {
      FooterAiActions: vi.fn(() => <div data-test-subj="footerAiActions" />),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('react-router-dom', () => {
  const original = require('react-router-dom');
  return {
    ...original,
    useLocation: vi.fn().mockReturnValue({ search: '' }),
  };
});
vi.mock(
  '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline'
);
vi.mock('../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions');
vi.mock('../shared/components/take_action_button', () => {
      const mocked = {
      TakeActionButton: () => (
        <button data-test-subj="securitySolutionFlyoutFooterDropdownButton" type="button" />
      ),
    };
      return { ...mocked, default: mocked };
    });

const renderPanelFooter = (isPreview: boolean) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <PanelFooter isRulePreview={isPreview} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('PanelFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render the take action dropdown if preview mode', () => {
    const { queryByTestId } = renderPanelFooter(true);

    expect(queryByTestId(FLYOUT_FOOTER_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render the take action dropdown', () => {
    (useKibana as Mock).mockReturnValue({
      services: {
        osquery: { isOsqueryAvailable: vi.fn() },
        cases: { hooks: { useIsAddToCaseOpen: vi.fn().mockReturnValue(false) } },
      },
    });
    (useInvestigateInTimeline as Mock).mockReturnValue({
      investigateInTimelineActionItems: [{ name: 'test', onClick: vi.fn() }],
    });
    (useAddToCaseActions as Mock).mockReturnValue({ addToCaseActionItems: [] });

    const { getByTestId } = renderPanelFooter(false);

    expect(getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render footer AI actions with document details context data', () => {
    const { getByTestId } = renderPanelFooter(false);

    expect(getByTestId('footerAiActions')).toBeInTheDocument();
    expect(FooterAiActions).toHaveBeenCalledWith(
      expect.objectContaining({
        dataFormattedForFieldBrowser: mockContextValue.dataFormattedForFieldBrowser,
        hit: expect.objectContaining({
          raw: expect.objectContaining({
            _id: mockContextValue.searchHit._id,
            _index: mockContextValue.searchHit._index,
          }),
        }),
      }),
      {}
    );
  });
});
