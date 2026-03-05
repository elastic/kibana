/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { NotesTab } from './notes_tab';
import { AttackDetailsProvider } from '../../context';
import { NOTES_TAB_CONTENT_TEST_ID } from '../../constants/test_ids';

jest.mock('../../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));

jest.mock('../../hooks/use_attack_details', () => ({
  useAttackDetails: jest.fn().mockReturnValue({
    loading: false,
    browserFields: {},
    dataFormattedForFieldBrowser: [],
    searchHit: { _index: 'test', _id: 'attack-123' },
    getFieldsData: jest.fn(),
  }),
}));

jest.mock('../../../shared/components/notes_details_content', () => ({
  NotesDetailsContent: jest.fn(() => (
    <div data-test-subj="notes-details-content">{'Notes details content'}</div>
  )),
}));

const renderNotesTab = () =>
  render(
    <TestProviders>
      <AttackDetailsProvider attackId="attack-123" indexName=".alerts-security.alerts-default">
        <NotesTab />
      </AttackDetailsProvider>
    </TestProviders>
  );

describe('NotesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders panel with notes tab content test id', () => {
    renderNotesTab();

    expect(screen.getByTestId(NOTES_TAB_CONTENT_TEST_ID)).toBeInTheDocument();
  });
});
