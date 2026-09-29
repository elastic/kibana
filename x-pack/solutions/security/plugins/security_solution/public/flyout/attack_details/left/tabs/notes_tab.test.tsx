/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { NotesTab } from './notes_tab';
import { AttackDetailsProvider } from '../../context';

vi.mock('../../../../common/hooks/use_space_id', () => {
  const mocked = {
    useSpaceId: () => 'default',
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_attack_details', () => {
  const mocked = {
    useAttackDetails: vi.fn().mockReturnValue({
      loading: false,
      attack: {
        id: 'test-alert-1',
        alertIds: ['alert-1'],
        detectionEngineRuleId: 'rule-1',
        ruleStatus: 'enabled',
        ruleVersion: 1,
        timestamp: '2024-01-01T00:00:00Z',
        entities: { users: [], hosts: [] },
        summaryMarkdown: '# Test Alert Summary',
        mitreTactics: [],
        mitreTechniques: [],
      },
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      searchHit: { _index: 'test', _id: 'attack-123' },
      getFieldsData: vi.fn(),
      refetch: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../flyout_v2/shared/tools/notes/components/notes_details_content', () => {
  const mocked = {
    NotesDetailsContent: vi.fn(() => (
      <div data-test-subj="notes-details-content">{'Notes details content'}</div>
    )),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../flyout_v2/shared/tools/notes/hooks/use_timeline_config', () => {
  const mocked = {
    useTimelineConfig: vi.fn().mockReturnValue(undefined),
  };
  return { ...mocked, default: mocked };
});

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
    vi.clearAllMocks();
  });

  it('renders notes details content', () => {
    renderNotesTab();

    expect(screen.getByTestId('notes-details-content')).toBeInTheDocument();
  });

  it('passes hideTimelineIcon=false to NotesDetailsContent', async () => {
    const { NotesDetailsContent } = await vi.importMock(
      '../../../../flyout_v2/shared/tools/notes/components/notes_details_content'
    );

    renderNotesTab();

    expect(NotesDetailsContent).toHaveBeenCalledWith(
      expect.objectContaining({ hideTimelineIcon: false }),
      expect.anything()
    );
  });
});
