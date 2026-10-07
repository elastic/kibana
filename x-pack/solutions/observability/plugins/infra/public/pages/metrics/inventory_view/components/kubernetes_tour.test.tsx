/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { KubernetesTour, KUBERNETES_TOUR_STORAGE_KEY } from './kubernetes_tour';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

jest.mock('../../../../hooks/use_kibana');

const useKibanaMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;

const TOUR_TEXT_TEST_SUBJ = 'infra-kubernetesTour-text';
const DISMISS_TEST_SUBJ = 'infra-kubernetesTour-dismiss';
const ANCHOR_TEST_SUBJ = 'inventorySwitcher';

const mockKibana = (areToursEnabled = true) => {
  useKibanaMock.mockReturnValue({
    services: {
      notifications: {
        tours: {
          isEnabled: () => areToursEnabled,
        },
      },
    },
  } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
};

const renderKubernetesTour = () =>
  render(
    <I18nProvider>
      <KubernetesTour>
        <button type="button" data-test-subj={ANCHOR_TEST_SUBJ}>
          Show inventory switcher
        </button>
      </KubernetesTour>
    </I18nProvider>
  );

describe('KubernetesTour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockKibana();
  });

  it('shows the tour to a user who has not seen it yet', () => {
    renderKubernetesTour();

    expect(screen.getByTestId(TOUR_TEXT_TEST_SUBJ)).toHaveTextContent(
      'Click here to see your infrastructure in different ways, including Kubernetes pods.'
    );
    expect(screen.getByTestId(ANCHOR_TEST_SUBJ)).toBeVisible();
  });

  it('hides the tour and records it as seen when dismissed', async () => {
    renderKubernetesTour();

    await userEvent.click(screen.getByTestId(DISMISS_TEST_SUBJ));

    // The tour step is a popover, so it leaves the DOM only once its closing transition finishes.
    await waitForElementToBeRemoved(() => screen.queryByTestId(TOUR_TEXT_TEST_SUBJ));
    expect(localStorage.getItem(KUBERNETES_TOUR_STORAGE_KEY)).toBe('true');
  });

  it('stays hidden on a later visit once it has been seen', async () => {
    const { unmount } = renderKubernetesTour();
    await userEvent.click(screen.getByTestId(DISMISS_TEST_SUBJ));
    await waitForElementToBeRemoved(() => screen.queryByTestId(TOUR_TEXT_TEST_SUBJ));
    unmount();

    renderKubernetesTour();

    expect(screen.queryByTestId(TOUR_TEXT_TEST_SUBJ)).not.toBeInTheDocument();
    expect(screen.getByTestId(ANCHOR_TEST_SUBJ)).toBeVisible();
  });

  it('does not show the tour when announcements are turned off', () => {
    mockKibana(false);

    renderKubernetesTour();

    expect(screen.queryByTestId(TOUR_TEXT_TEST_SUBJ)).not.toBeInTheDocument();
    expect(screen.getByTestId(ANCHOR_TEST_SUBJ)).toBeVisible();
  });
});
