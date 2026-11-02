/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkerBlockedAfterSaveModal } from './worker_blocked_after_save_modal';

describe('WorkerBlockedAfterSaveModal', () => {
  it('says the save went through, gives the reason and only offers acknowledgement', () => {
    const onAcknowledge = jest.fn();
    render(
      <WorkerBlockedAfterSaveModal
        workerName="Rule Coverage"
        reasons={[
          { id: 'hunt', message: 'Continuous Threat Hunt is disabled — no gap signals to act on.' },
        ]}
        onAcknowledge={onAcknowledge}
      />
    );
    const modal = screen.getByTestId('alertZeroWorkerBlockedAfterSaveModal');

    expect(modal).toHaveTextContent("Saved — but Rule Coverage won't run properly yet");
    expect(modal).toHaveTextContent(
      'Continuous Threat Hunt is disabled — no gap signals to act on.'
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      "Saved — but Rule Coverage won't run properly yet"
    );

    fireEvent.click(screen.getByTestId('alertZeroWorkerBlockedAfterSaveAcknowledge'));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });
});
