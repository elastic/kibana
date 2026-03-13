/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act, render } from '@testing-library/react';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useExpandSection } from '../../shared/hooks/use_expand_section';
import { AI_SUMMARY_SECTION_TEST_ID, AiSummarySection } from './ai_summary_section';

jest.mock('../../shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(),
}));

jest.mock('react-use/lib/useLocalStorage', () => jest.fn());

jest.mock('./alert_summary_options_menu', () => ({
  AlertSummaryOptionsMenu: () => <div data-test-subj="optionsMenu">{'Options menu'}</div>,
}));

jest.mock('./ai_summary', () => ({
  AiSummary: () => <div data-test-subj="aiSummaryContent">{'AI summary content'}</div>,
}));

const createMockHit = (): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: 'event-id' },
    flattened: { 'event.kind': 'signal' },
    isAnchor: false,
  } as DataTableRecord);

describe('AiSummarySection', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);
  const mockUseSpaceId = jest.mocked(useSpaceId);
  const mockUseLocalStorage = jest.mocked(useLocalStorage);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSpaceId.mockReturnValue('default');
    mockUseLocalStorage.mockReturnValue([false, jest.fn(), jest.fn()]);
  });

  it('renders AI summary section header and content', async () => {
    mockUseExpandSection.mockReturnValue(true);

    const { getByTestId } = render(
      <IntlProvider locale="en">
        <AiSummarySection hit={createMockHit()} />
      </IntlProvider>
    );

    await act(async () => {
      expect(getByTestId(`${AI_SUMMARY_SECTION_TEST_ID}Header`)).toHaveTextContent('AI summary');
      expect(getByTestId('optionsMenu')).toBeInTheDocument();
      expect(getByTestId('aiSummaryContent')).toBeInTheDocument();
    });
  });
});
