/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { createMemoryHistory } from 'history';
import { of } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { NightshiftStartDependencies } from '../types';
import { AppRoot } from './app_root';

jest.mock('@kbn/ebt-tools/react', () => ({
  PerformanceContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./nightshift_page', () => ({
  NightshiftPage: () => {
    // Exposes the services Nightshift hooks read, so the tests can assert on them.
    capturedServices = useKibana<Pick<CoreStart, 'notifications'>>().services;
    return <div data-test-subj="nightshiftPageStub" />;
  },
}));

let capturedServices: Pick<CoreStart, 'notifications'> | undefined;

const renderAppRoot = (spaceId?: string) => {
  const coreStart = coreMock.createStart();
  coreStart.notifications.toasts.addSuccess.mockReturnValue({ id: 'success' });
  coreStart.notifications.toasts.addError.mockReturnValue({ id: 'error' });
  coreStart.uiSettings.get.mockImplementation((key: string) =>
    key === 'notifications:lifetime:error' ? 300000 : 5000
  );
  const pluginsStart = {
    ...(spaceId
      ? {
          spaces: {
            getActiveSpace$: () => of({ id: spaceId, name: spaceId, disabledFeatures: [] }),
          } as unknown as SpacesPluginStart,
        }
      : {}),
  } as NightshiftStartDependencies;

  const result = render(
    <I18nProvider>
      <AppRoot
        appMountParameters={{ history: createMemoryHistory() } as unknown as AppMountParameters}
        coreStart={coreStart as unknown as CoreStart}
        pluginsStart={pluginsStart}
        isServerless={false}
        focusedSignificantEventService={{} as never}
      />
    </I18nProvider>
  );

  return { ...result, coreStart };
};

describe('AppRoot', () => {
  beforeEach(() => {
    capturedServices = undefined;
  });

  it('renders Nightshift in the default space', async () => {
    renderAppRoot('default');

    expect(await screen.findByTestId('nightshiftPageStub')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftUnsupportedSpacePrompt')).not.toBeInTheDocument();
  });

  it('explains the space instead of rendering Nightshift in another space', async () => {
    renderAppRoot('marketing');

    expect(await screen.findByTestId('nightshiftUnsupportedSpacePrompt')).toBeInTheDocument();
    expect(screen.getByText('Nightshift only works in the default space for now')).toBeVisible();
    expect(screen.queryByTestId('nightshiftPageStub')).not.toBeInTheDocument();
  });

  it('renders Nightshift when the spaces plugin is not available', async () => {
    renderAppRoot();

    expect(await screen.findByTestId('nightshiftPageStub')).toBeInTheDocument();
  });

  describe('toasts', () => {
    it('gives Nightshift capped toasts and keeps the rest of the notifications service', async () => {
      const { coreStart } = renderAppRoot('default');
      await screen.findByTestId('nightshiftPageStub');

      const { notifications } = capturedServices ?? {};
      expect(notifications?.toasts).not.toBe(coreStart.notifications.toasts);
      expect(notifications?.screenReader).toBe(coreStart.notifications.screenReader);

      notifications?.toasts.addSuccess('saved');
      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith('saved', {
        toastLifeTimeMs: 4000,
      });
    });

    it('removes its toasts when Nightshift unmounts', async () => {
      const { coreStart, unmount } = renderAppRoot('default');
      await screen.findByTestId('nightshiftPageStub');
      const toast = capturedServices?.notifications.toasts.addError(new Error('boom'), {
        title: 'Failed',
      });
      expect(toast).toEqual({ id: 'error' });
      expect(coreStart.notifications.toasts.remove).not.toHaveBeenCalled();

      unmount();

      expect(coreStart.notifications.toasts.remove).toHaveBeenCalledWith(toast);
    });
  });
});
