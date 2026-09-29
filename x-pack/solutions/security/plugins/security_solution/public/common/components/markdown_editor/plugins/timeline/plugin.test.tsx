/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '@kbn/cases-plugin/common';

import { plugin } from './plugin';
import { useKibana } from '../../../../lib/kibana';
import { SELECT_TIMELINE_MODAL_TITLE, INSERT_TIMELINE_ATTACH_HINT } from './translations';

vi.mock('../../../../lib/kibana');
vi.mock('../../../link_to', () => {
      const mocked = {
      useFormatUrl: () => ({ formatUrl: vi.fn() }),
      getTimelineUrl: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../../cases/attachments/timeline/select_timeline_modal_body', () => {
      const mocked = {
      SelectTimelineModalBody: () => <div data-test-subj="select-timeline-modal-body-mock" />,
    };
      return { ...mocked, default: mocked };
    });

describe('timeline markdown plugin', () => {
  const reportEvent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useKibana as Mock).mockReturnValue({
      services: { analytics: { reportEvent } },
    });
  });

  it('reports the timeline markdown plugin click on mount', () => {
    const Editor = plugin({ canSeeTimeline: true }).editor;
    if (!Editor) {
      throw new Error('Timeline markdown plugin editor is not defined');
    }

    render(<Editor node={{} as never} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith(CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE, {
      owner: SECURITY_SOLUTION_OWNER,
      plugin_type: 'timeline',
    });
    expect(screen.getByText(SELECT_TIMELINE_MODAL_TITLE)).toBeInTheDocument();
  });

  it('does not show the attach hint when attachments are disabled', () => {
    const Editor = plugin({ canSeeTimeline: true }).editor;
    if (!Editor) {
      throw new Error('Timeline markdown plugin editor is not defined');
    }

    render(<Editor node={{} as never} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByText(INSERT_TIMELINE_ATTACH_HINT)).not.toBeInTheDocument();
  });

  it('shows the attach hint when attachments are enabled', () => {
    (useKibana as Mock).mockReturnValue({
      services: {
        analytics: { reportEvent },
        cases: { config: { attachmentsEnabled: true } },
      },
    });
    const Editor = plugin({ canSeeTimeline: true }).editor;
    if (!Editor) {
      throw new Error('Timeline markdown plugin editor is not defined');
    }

    render(<Editor node={{} as never} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(INSERT_TIMELINE_ATTACH_HINT)).toBeInTheDocument();
  });
});
