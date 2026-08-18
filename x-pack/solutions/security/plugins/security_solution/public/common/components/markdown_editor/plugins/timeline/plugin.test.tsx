/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '@kbn/cases-plugin/common';

import { plugin } from './plugin';
import { useKibana } from '../../../../lib/kibana';

jest.mock('../../../../lib/kibana');
jest.mock('../../../link_to', () => ({
  useFormatUrl: () => ({ formatUrl: jest.fn() }),
  getTimelineUrl: jest.fn(),
}));
jest.mock('../../../../../cases/attachments/timeline/select_timeline_modal_body', () => ({
  SelectTimelineModalBody: () => <div data-test-subj="select-timeline-modal-body-mock" />,
}));

describe('timeline markdown plugin', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { analytics: { reportEvent } },
    });
  });

  it('reports the timeline markdown plugin click on mount', () => {
    const Editor = plugin({ canSeeTimeline: true }).editor;
    if (!Editor) {
      throw new Error('Timeline markdown plugin editor is not defined');
    }

    render(<Editor node={{} as never} onSave={jest.fn()} onCancel={jest.fn()} />);

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith(CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE, {
      owner: SECURITY_SOLUTION_OWNER,
      plugin_type: 'timeline',
    });
  });
});
