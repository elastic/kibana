/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { InvestigationSection } from './investigation_section';
import { HighlightedFields } from './highlighted_fields';
import { HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID } from './test_ids';
import { EVENT_SOURCE_FIELD_DESCRIPTOR } from '../../../../common/components/event_details/translations';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { useFlyoutApi } from '../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../use_flyout_api.mock';

// The main suite (investigation_section.test.tsx) exercises the real flyout API.
// These tests instead stub the API to assert `indexName`.
jest.mock('../../../use_flyout_api');

jest.mock('../../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

jest.mock('./highlighted_fields', () => ({
  HighlightedFields: jest.fn(() => <div data-test-subj="highlightedFieldsMock" />),
}));

jest.mock('./investigation_guide', () => ({
  InvestigationGuide: () => null,
}));

jest.mock('../../../../detection_engine/rule_management/logic/use_rule_with_fallback', () => ({
  useRuleWithFallback: jest.fn().mockReturnValue({ rule: null, loading: false, error: null }),
}));

const createMockHit = (
  flattened: DataTableRecord['flattened'],
  rawIndex: string
): DataTableRecord =>
  ({
    id: '1',
    raw: { _index: rawIndex },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const mockRenderCellActions = jest.fn(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));

describe('InvestigationSection Source event link under CPS', () => {
  const mockHighlightedFields = jest.mocked(HighlightedFields);
  const flyoutApiMock = createFlyoutApiMock();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandSection).mockReturnValue(true);
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApiMock);
  });

  const clickSourceEventLink = (hit: DataTableRecord) => {
    render(
      <IntlProvider locale="en">
        <InvestigationSection hit={hit} renderCellActions={mockRenderCellActions} />
      </IntlProvider>
    );

    const renderFlyoutLink = mockHighlightedFields.mock.calls[0][0].renderFlyoutLink;
    const element = renderFlyoutLink!({
      field: EVENT_SOURCE_FIELD_DESCRIPTOR,
      value: 'ancestor-id-1',
      children: <span data-test-subj="sourceEventChild" />,
    }) as React.ReactElement;

    const { getByTestId } = render(<IntlProvider locale="en">{element}</IntlProvider>);
    act(() => getByTestId(HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID).click());
  };

  it('qualifies the ancestor index with the alert project alias for a linked-project alert', () => {
    clickSourceEventLink(
      createMockHit(
        {
          'event.kind': 'signal',
          'signal.ancestors.index': 'logs-endpoint.alerts.caf6b705.2026.08.13',
        },
        'linked_local_project:.ds-.alerts-security.alerts-default-2026.08.13-000001'
      )
    );

    expect(flyoutApiMock.openDocumentFlyoutFromIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'ancestor-id-1',
        indexName: 'linked_local_project:logs-endpoint.alerts.caf6b705.2026.08.13',
      })
    );
  });

  it('leaves the ancestor index untouched for an origin alert', () => {
    clickSourceEventLink(
      createMockHit(
        {
          'event.kind': 'signal',
          'signal.ancestors.index': 'logs-endpoint.alerts.caf6b705.2026.08.13',
        },
        '.ds-.alerts-security.alerts-default-2026.08.13-000001'
      )
    );

    expect(flyoutApiMock.openDocumentFlyoutFromIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'ancestor-id-1',
        indexName: 'logs-endpoint.alerts.caf6b705.2026.08.13',
      })
    );
  });
});
