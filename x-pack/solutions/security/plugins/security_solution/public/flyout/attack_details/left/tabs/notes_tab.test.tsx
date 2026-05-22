/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../common/mock';
import { NotesTab } from './notes_tab';

jest.mock('../../../../flyout_v2/shared/tools/notes/components/notes_details_content', () => ({
  NotesDetailsContent: jest.fn(() => (
    <div data-test-subj="notes-details-content">{'Notes details content'}</div>
  )),
}));

jest.mock('../../../../flyout_v2/shared/tools/notes/components/notes_remote_callout', () => ({
  NotesRemoteCallout: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../../../flyout_v2/shared/tools/notes/hooks/use_timeline_config', () => ({
  useTimelineConfig: jest.fn().mockReturnValue(undefined),
}));

const hit: DataTableRecord = {
  id: 'attack-123',
  raw: { _id: 'attack-123', _index: 'test', _source: {} },
  flattened: {},
};

describe('NotesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notes details content', () => {
    render(
      <TestProviders>
        <NotesTab hit={hit} />
      </TestProviders>
    );

    expect(screen.getByTestId('notes-details-content')).toBeInTheDocument();
  });

  it('passes hideTimelineIcon=false to NotesDetailsContent', () => {
    const { NotesDetailsContent } = jest.requireMock(
      '../../../../flyout_v2/shared/tools/notes/components/notes_details_content'
    );

    render(
      <TestProviders>
        <NotesTab hit={hit} />
      </TestProviders>
    );

    expect(NotesDetailsContent).toHaveBeenCalledWith(
      expect.objectContaining({ hit, hideTimelineIcon: false }),
      expect.anything()
    );
  });
});
