/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { EuiThemeProvider as ThemeProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { AnnotationsPage } from './annotations';
import { usePluginContext as usePluginContextImport } from '../../hooks/use_plugin_context';
import { useAnnotationsPrivileges as useAnnotationsPrivilegesImport } from './annotations_privileges';
const mockUseKibanaReturnValue = kibanaStartMock.startContract();
const onboardingHref = '/app/observabilityOnboarding';
const onboardingLocator = sharePluginMock.createLocator();
onboardingLocator.useUrl.mockReturnValue(onboardingHref);
vi.spyOn(mockUseKibanaReturnValue.services.share.url.locators, 'get').mockReturnValue(
  onboardingLocator
);

vi.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: vi.fn(() => mockUseKibanaReturnValue),
}));

vi.mock('@kbn/observability-shared-plugin/public', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/observability-shared-plugin/public')),
    useBreadcrumbs: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_plugin_context');
vi.mock('./annotations_privileges');
vi.mock('./annotations_list', () => {
  const mocked = {
    AnnotationsList: () => <div data-test-subj="annotationsList" />,
  };
  return { ...mocked, default: mocked };
});

const usePluginContext = usePluginContextImport as unknown as Mock;
const useAnnotationsPrivileges = useAnnotationsPrivilegesImport as unknown as Mock;

function ObservabilityPageTemplate({
  children,
  'data-test-subj': dataTestSubj,
}: {
  children?: ReactNode;
  'data-test-subj'?: string;
}) {
  return <div data-test-subj={dataTestSubj}>{children}</div>;
}

function renderPage() {
  return render(
    <ThemeProvider>
      <IntlProvider locale="en">
        <MockAppHeaderProvider>
          <AnnotationsPage />
        </MockAppHeaderProvider>
      </IntlProvider>
    </ThemeProvider>
  );
}

describe('AnnotationsPage', () => {
  beforeEach(() => {
    usePluginContext.mockReturnValue({
      ObservabilityPageTemplate,
    });
    vi.spyOn(mockUseKibanaReturnValue.services.share.url.locators, 'get').mockReturnValue(
      onboardingLocator
    );
    onboardingLocator.useUrl.mockReturnValue(onboardingHref);
  });

  it('renders the list when the user has privileges', () => {
    useAnnotationsPrivileges.mockReturnValue(null);

    renderPage();

    expect(screen.getByTestId('annotationsPage')).toBeInTheDocument();
    expect(screen.getByTestId('annotationsList')).toBeInTheDocument();
  });

  it('renders the title when privileges are missing', () => {
    useAnnotationsPrivileges.mockReturnValue(<div data-test-subj="privilegesPrompt" />);

    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Annotations');
    expect(screen.getByTestId('privilegesPrompt')).toBeInTheDocument();
    expect(screen.queryByTestId('annotationsList')).not.toBeInTheDocument();
  });
});
