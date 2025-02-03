/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getArtifactListPageRenderingSetup } from '../../mocks';
import { waitFor } from '@testing-library/react';

const setupTest = async () => {
  const renderSetup = getArtifactListPageRenderingSetup();

  const { history, coreStart, mockedApi, getFirstCard, user } = renderSetup;

  history.push('somepage?show=create');

  const renderResult = renderSetup.renderArtifactListPage();

  await waitFor(() => {
    expect(renderResult.getByTestId('testPage-list')).toBeInTheDocument();
  });

  const clickCardAction = async (action: 'edit' | 'delete') => {
    await getFirstCard({ showActions: true });
    switch (action) {
      case 'delete':
        await user.click(renderResult.getByTestId('testPage-card-cardDeleteAction'));
        break;

      case 'edit':
        await user.click(renderResult.getByTestId('testPage-card-cardEditAction'));
        break;
    }
  };

  await clickCardAction('delete');

  // Wait for the dialog to be present
  await waitFor(() => {
    expect(renderResult.getByTestId('testPage-deleteModal')).toBeInTheDocument();
  });

  const cancelButton = renderResult.getByTestId(
    'testPage-deleteModal-cancelButton'
  ) as HTMLButtonElement;

  const submitButton = renderResult.getByTestId(
    'testPage-deleteModal-submitButton'
  ) as HTMLButtonElement;

  return { cancelButton, submitButton, user, coreStart, mockedApi, renderResult };
};

describe('When displaying the Delete artifact modal in the Artifact List Page', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show Cancel and Delete buttons enabled', async () => {
    const { cancelButton, submitButton } = await setupTest();

    expect(cancelButton).toBeEnabled();
    expect(submitButton).toBeEnabled();
  });

  it('should close modal if Cancel/Close buttons are clicked', async () => {
    const { cancelButton, user, renderResult } = await setupTest();

    await user.click(cancelButton);

    expect(renderResult.queryByTestId('testPage-deleteModal')).not.toBeInTheDocument();
  });

  it('should prevent modal from being closed while deletion is in flight', async () => {
    const { submitButton, mockedApi, user, renderResult } = await setupTest();

    mockedApi.responseProvider.trustedAppDelete.mockImplementation(
      // @ts-expect-error This satisfies the test, but the type is incorrect
      () => new Promise((resolve) => setTimeout(() => resolve({ name: 'the-name' }), 500))
    );

    await user.click(submitButton);

    expect(renderResult.queryByTestId('testPage-deleteModal')).toBeInTheDocument();

    jest.advanceTimersByTime(510);

    await waitFor(() => {
      expect(renderResult.queryByTestId('testPage-deleteModal')).not.toBeInTheDocument();
    });
  });

  it('should show success toast if deleted successfully', async () => {
    const { submitButton, coreStart, mockedApi, user } = await setupTest();

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedApi.responseProvider.trustedAppDelete).toHaveBeenCalled();
    });

    expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      expect.stringMatching(/ has been removed$/)
    );
  });

  // FIXME:PT investigate test failure
  // (I don't understand why its failing... All assertions are successful -- HELP!)
  it.skip('should show error toast if deletion failed', async () => {
    const { cancelButton, submitButton, mockedApi, user, coreStart, renderResult } =
      await setupTest();

    mockedApi.responseProvider.trustedAppDelete.mockImplementation(() => {
      throw new Error('oh oh');
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedApi.responseProvider.trustedAppDelete).toHaveBeenCalled();
    });

    expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
      expect.stringMatching(/^Unable to remove .*\. Reason: oh oh/)
    );
    expect(renderResult.getByTestId('testPage-deleteModal')).toBeTruthy();
    expect(cancelButton).toBeEnabled();
    expect(submitButton).toBeEnabled();
  });
});
