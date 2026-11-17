/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { createMemoryHistory } from 'history';
import { of } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { NightshiftStartDependencies } from '../types';
import { AppRoot } from './app_root';

jest.mock('@kbn/ebt-tools', () => ({
  PerformanceContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./nightshift_page', () => ({
  NightshiftPage: () => <div data-test-subj="nightshiftPageStub" />,
}));

const renderAppRoot = (spaceId?: string) => {
  const coreStart = coreMock.createStart();
  const pluginsStart = {
    ...(spaceId
      ? {
          spaces: {
            getActiveSpace$: () => of({ id: spaceId, name: spaceId, disabledFeatures: [] }),
          } as unknown as SpacesPluginStart,
        }
      : {}),
  } as NightshiftStartDependencies;

  return render(
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
};

describe('AppRoot', () => {
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
});
