/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { NewTimelineButton } from './new_timeline_button';
import { TimelineId } from '../../../../../common/types';
import { timelineActions } from '../../../store';
import { TestProviders } from '../../../../common/mock';
import { RowRendererValues } from '../../../../../common/api/timeline';
import { defaultUdtHeaders } from '../../timeline/body/column_headers/default_headers';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';

vi.mock('../../../../common/components/discover_in_timeline/use_discover_in_timeline_context');
vi.mock('../../../../data_view_manager/hooks/use_security_default_patterns');
vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');

  return {
    ...original,
    useDispatch: () => vi.fn(),
  };
});

const renderNewTimelineButton = () =>
  render(<NewTimelineButton timelineId={TimelineId.test} />, { wrapper: TestProviders });

describe('NewTimelineButton', () => {
  it('should render 2 options in the popover when clicking on the button', async () => {
    (useSecurityDefaultPatterns as Mock).mockReturnValue({
      id: '',
      indexPatterns: [],
    });

    const { getByTestId, getByText } = renderNewTimelineButton();

    const button = getByTestId('timeline-modal-new-timeline-dropdown-button');

    expect(button).toBeInTheDocument();
    expect(getByText('New')).toBeInTheDocument();

    await userEvent.click(button);

    expect(getByTestId('timeline-modal-new-timeline')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-new-timeline')).toHaveTextContent('New Timeline');

    expect(getByTestId('timeline-modal-new-timeline-template')).toBeInTheDocument();
    expect(getByTestId('timeline-modal-new-timeline-template')).toHaveTextContent(
      'New Timeline template'
    );
  });

  it('should call the correct action with clicking on the new timeline button', async () => {
    const dataViewId = 'security-solution';
    const selectedPatterns: string[] = [
      'apm-*-transaction*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'logs-*',
      'packetbeat-*',
      'traces-apm*',
      'winlogbeat-*',
      '-*elastic-cloud-logs-*',
      '.siem-signals-spacename',
    ];

    (useSecurityDefaultPatterns as Mock).mockReturnValue({
      id: dataViewId,
      indexPatterns: selectedPatterns,
    });

    const spy = vi.spyOn(timelineActions, 'createTimeline');

    const { getByTestId } = renderNewTimelineButton();

    await userEvent.click(getByTestId('timeline-modal-new-timeline-dropdown-button'));
    await userEvent.click(getByTestId('timeline-modal-new-timeline'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        columns: defaultUdtHeaders,
        dataViewId,
        id: TimelineId.test,
        indexNames: selectedPatterns,
        show: true,
        timelineType: 'default',
        updated: undefined,
        excludedRowRendererIds: RowRendererValues,
      });
    });
  });
});
