/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiCopy } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { ApiStep, type ApiStepTab } from './api_step';
import { LANGUAGES } from '../constants/languages';
import { API_KEY_PLACEHOLDER, URL_PLACEHOLDER } from '../constants/console_snippets';
import { useOnboardingCredentials } from '../../hooks/use_onboarding_credentials';
import type { OnboardingServices } from '../../services';

jest.mock('../../hooks/use_onboarding_credentials', () => ({
  useOnboardingCredentials: jest.fn(),
}));

jest.mock('@kbn/try-in-console', () => ({
  TryInConsoleButton: jest.fn(() => null),
}));

const mockCopy = jest.fn();
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(({ children }) => children(mockCopy)),
}));

const mockUseOnboardingCredentials = useOnboardingCredentials as jest.Mock;
const mockTryInConsoleButton = TryInConsoleButton as unknown as jest.Mock;
const mockEuiCopy = EuiCopy as unknown as jest.Mock;

const makeSnippets = (prefix: string) =>
  Object.fromEntries(
    LANGUAGES.map(({ id }) => [id, `${prefix} ${id} code`])
  ) as ApiStepTab['snippets'];

const semanticTab: ApiStepTab = {
  id: 'semantic',
  label: 'Semantic',
  snippets: makeSnippets('semantic'),
  consoleRequest: 'POST my-vectors/_search\n{ "semantic": true }',
};

const hybridTab: ApiStepTab = {
  id: 'hybrid',
  label: 'Hybrid',
  snippets: makeSnippets('hybrid'),
  consoleRequest: 'POST my-vectors/_search\n{ "hybrid": true }',
};

const isInTrial = jest.fn();

const makeServices = () =>
  ({
    application: {},
    share: {},
    console: {},
    cloud: { isInTrial },
  } as unknown as OnboardingServices);

const renderComponent = (props: Partial<React.ComponentProps<typeof ApiStep>> = {}) =>
  render(
    <KibanaContextProvider services={makeServices()}>
      <ApiStep
        tabs={[semanticTab, hybridTab]}
        consoleComment="Test console comment"
        docsPanel={[]}
        pills={[]}
        step="search"
        path="generate-vectors"
        {...props}
      />
    </KibanaContextProvider>
  );

const getSnippetText = () => screen.getByTestId('vectordbWizardSnippet').textContent;

const getLastTryInConsoleRequest = (): string =>
  mockTryInConsoleButton.mock.calls[mockTryInConsoleButton.mock.calls.length - 1][0].request;

const getLastCopyText = (): string =>
  mockEuiCopy.mock.calls[mockEuiCopy.mock.calls.length - 1][0].textToCopy;

describe('ApiStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseOnboardingCredentials.mockReturnValue({
      elasticsearchUrl: null,
      apiKey: null,
      isLoading: false,
    });
    isInTrial.mockReturnValue(false);
  });

  describe('pills', () => {
    const trialPill = {
      id: 'freeTrialEmbeddings',
      label: 'Free trial embeddings',
      content: 'Trial content',
      trialOnly: true,
    };
    const standardPill = {
      id: 'jinaModels',
      label: 'Jina embedding models',
      content: 'Jina content',
    };

    it('shows trial pills while the project is in trial', () => {
      isInTrial.mockReturnValue(true);

      renderComponent({ pills: [trialPill, standardPill] });

      expect(screen.getByTestId('vectordbWizardPill-freeTrialEmbeddings')).toBeInTheDocument();
      expect(screen.getByTestId('vectordbWizardPill-jinaModels')).toBeInTheDocument();
    });

    it('hides trial pills outside of a trial', () => {
      renderComponent({ pills: [trialPill, standardPill] });

      expect(
        screen.queryByTestId('vectordbWizardPill-freeTrialEmbeddings')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('vectordbWizardPill-jinaModels')).toBeInTheDocument();
    });

    it('hides the pill group when every pill is trial only', () => {
      renderComponent({ pills: [trialPill] });

      expect(screen.queryByTestId('vectordbWizardPills')).not.toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('renders a tab for each entry with the first tab selected by default', () => {
      renderComponent();

      expect(screen.getByTestId('vectordbWizardSnippetTab-semantic')).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByTestId('vectordbWizardSnippetTab-hybrid')).toHaveAttribute(
        'aria-selected',
        'false'
      );
      expect(getSnippetText()).toContain('semantic python code');
    });

    it('does not render a tab bar when there is a single tab', () => {
      renderComponent({ tabs: [semanticTab] });

      expect(screen.queryByTestId('vectordbWizardSnippetTab-semantic')).not.toBeInTheDocument();
      expect(getSnippetText()).toContain('semantic python code');
    });

    it('swaps the code example when switching tabs', () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('vectordbWizardSnippetTab-hybrid'));

      expect(getSnippetText()).toContain('hybrid python code');
      expect(getSnippetText()).not.toContain('semantic python code');
      expect(screen.getByTestId('vectordbWizardSnippetTab-hybrid')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });

  describe('Run in Console', () => {
    it('loads the request from the default tab', () => {
      renderComponent();

      expect(getLastTryInConsoleRequest()).toContain(semanticTab.consoleRequest);
      expect(getLastTryInConsoleRequest()).toContain('Test console comment');
    });

    it('loads the request from the active tab after switching', () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('vectordbWizardSnippetTab-hybrid'));

      expect(getLastTryInConsoleRequest()).toContain(hybridTab.consoleRequest);
      expect(getLastTryInConsoleRequest()).not.toContain(semanticTab.consoleRequest);
    });

    it('names the example type in the comment when there are several examples', () => {
      renderComponent();

      expect(getLastTryInConsoleRequest()).toContain('Test console comment (Semantic)');

      fireEvent.click(screen.getByTestId('vectordbWizardSnippetTab-hybrid'));

      expect(getLastTryInConsoleRequest()).toContain('Test console comment (Hybrid)');
      expect(getLastTryInConsoleRequest()).not.toContain('(Semantic)');
    });

    it('omits the example type when there is only one example', () => {
      renderComponent({ tabs: [semanticTab] });

      expect(getLastTryInConsoleRequest()).toContain('Test console comment');
      expect(getLastTryInConsoleRequest()).not.toContain('(Semantic)');
    });
  });

  describe('Copy', () => {
    it('copies the code from the default tab', () => {
      renderComponent();

      expect(getLastCopyText()).toBe('semantic python code');

      fireEvent.click(screen.getByTestId('vectordbWizardCopyCode'));
      expect(mockCopy).toHaveBeenCalled();
    });

    it('copies the code from the active tab after switching', () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('vectordbWizardSnippetTab-hybrid'));

      expect(getLastCopyText()).toBe('hybrid python code');
    });
  });

  describe('language selection', () => {
    const selectJavascript = () => {
      fireEvent.click(screen.getByTestId('vectordbWizardLanguagePicker'));
      fireEvent.click(screen.getByTestId('vectordbWizardLanguageOption-javascript'));
    };

    it('swaps the snippet when a language is selected', () => {
      renderComponent();

      selectJavascript();

      expect(getSnippetText()).toContain('semantic javascript code');
    });

    it('persists the selected language across tab switches', () => {
      renderComponent();

      selectJavascript();
      fireEvent.click(screen.getByTestId('vectordbWizardSnippetTab-hybrid'));

      expect(getSnippetText()).toContain('hybrid javascript code');
      expect(screen.getByTestId('vectordbWizardLanguagePicker')).toHaveTextContent('JavaScript');
    });

    it('restores the selected language on a later visit', () => {
      const { unmount } = renderComponent();

      selectJavascript();
      unmount();

      renderComponent({ tabs: [semanticTab], step: 'ingest' });

      expect(getSnippetText()).toContain('semantic javascript code');
      expect(screen.getByTestId('vectordbWizardLanguagePicker')).toHaveTextContent('JavaScript');
    });
  });

  describe('credential placeholders', () => {
    it('fills URL and API key placeholders in the snippet and copy text on every tab', () => {
      mockUseOnboardingCredentials.mockReturnValue({
        elasticsearchUrl: 'https://my-cluster.es.io',
        apiKey: 'my-api-key',
        isLoading: false,
      });
      const withPlaceholders = (id: string): ApiStepTab => ({
        ...semanticTab,
        id,
        label: id,
        snippets: {
          ...makeSnippets(id),
          python: `${id} connect to ${URL_PLACEHOLDER} with ${API_KEY_PLACEHOLDER}`,
        },
      });
      renderComponent({ tabs: [withPlaceholders('first'), withPlaceholders('second')] });

      expect(getSnippetText()).toContain(
        'first connect to https://my-cluster.es.io with my-api-key'
      );

      fireEvent.click(screen.getByTestId('vectordbWizardSnippetTab-second'));

      expect(getSnippetText()).toContain(
        'second connect to https://my-cluster.es.io with my-api-key'
      );
      expect(getLastCopyText()).toBe('second connect to https://my-cluster.es.io with my-api-key');
    });
  });
});
