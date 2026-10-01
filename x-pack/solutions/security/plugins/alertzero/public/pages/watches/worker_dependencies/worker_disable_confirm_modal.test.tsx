/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import { getDisableConfirmation } from './worker_dependencies';
import { WorkerDisableConfirmModal } from './worker_disable_confirm_modal';

const renderModal = () => {
  const confirmation = getDisableConfirmation(
    SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    new Map([
      [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID, true],
      [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID, true],
    ])
  );
  if (!confirmation) {
    throw new Error('expected a confirmation');
  }
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <I18nProvider>
      <WorkerDisableConfirmModal
        confirmation={confirmation}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </I18nProvider>
  );
  return { onConfirm, onCancel };
};

describe('WorkerDisableConfirmModal', () => {
  it('names the Worker in the title and the dependent in the body', () => {
    renderModal();
    const modal = screen.getByTestId('alertZeroWorkerDisableConfirmModal');

    expect(modal).toHaveTextContent('Disable Continuous Threat Hunt?');
    expect(modal).toHaveTextContent(
      "Rule Coverage is enabled and depends on this Worker's findings. While Continuous Threat Hunt is off, Rule Coverage has no gap signals to act on."
    );
  });

  it('focuses Cancel by default and cancels without confirming', async () => {
    const { onConfirm, onCancel } = renderModal();
    const cancel = screen.getByTestId('confirmModalCancelButton');

    expect(cancel).toHaveTextContent('Cancel');
    await waitFor(() => expect(cancel).toHaveFocus());
    fireEvent.click(cancel);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms with Disable Worker', () => {
    const { onConfirm, onCancel } = renderModal();
    const confirm = screen.getByTestId('confirmModalConfirmButton');

    expect(confirm).toHaveTextContent('Disable Worker');
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
