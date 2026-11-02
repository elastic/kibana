/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { notifyWorkerUpdateError } from './use_workers_api';

const httpError = (status: number): Error =>
  Object.assign(new Error(`HTTP ${status}`), {
    name: 'Error',
    request: {},
    response: { status },
  });

describe('notifyWorkerUpdateError', () => {
  const toasts = coreMock.createStart().notifications.toasts;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('warns on 409 without a stack toast', () => {
    notifyWorkerUpdateError(toasts, httpError(409));

    expect(toasts.addWarning).toHaveBeenCalledWith('Worker settings changed; reload and try again');
    expect(toasts.addDanger).not.toHaveBeenCalled();
    expect(toasts.addError).not.toHaveBeenCalled();
  });

  it('uses danger on 403 without a stack toast', () => {
    notifyWorkerUpdateError(toasts, httpError(403));

    expect(toasts.addDanger).toHaveBeenCalledWith(
      'You do not have permission to update this worker'
    );
    expect(toasts.addWarning).not.toHaveBeenCalled();
    expect(toasts.addError).not.toHaveBeenCalled();
  });

  it('keeps addError for unexpected failures', () => {
    const error = httpError(500);
    notifyWorkerUpdateError(toasts, error);

    expect(toasts.addError).toHaveBeenCalledWith(error, { title: 'Unable to update the worker' });
    expect(toasts.addWarning).not.toHaveBeenCalled();
    expect(toasts.addDanger).not.toHaveBeenCalled();
  });
});
