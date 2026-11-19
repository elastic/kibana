/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { shallow } from 'enzyme';
import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { getKibanaPageTemplateKibanaDependenciesMock as getPageTemplateServices } from '@kbn/shared-ux-page-kibana-template-mocks';

import { createLazyObservabilityPageTemplate } from './lazy_page_template';
import { ObservabilityPageTemplate } from './page_template';
import { createNavigationRegistry } from './helpers/navigation_registry';
import { applicationServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/test-path',
  }),
}));

const mockNotifications = notificationServiceMock.createStartContract();
const mockApplication = applicationServiceMock.createStartContract();
const mockSpaces = spacesPluginMock.createStartContract();

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => ({
      services: {
        notifications: mockNotifications,
        application: mockApplication,
        spaces: mockSpaces,
      },
    }),
  };
});

const navigationRegistry = createNavigationRegistry();

navigationRegistry.registerSections(
  of([
    {
      label: 'Test A',
      sortKey: 100,
      entries: [
        { label: 'Section A Url A', app: 'TestA', path: '/url-a' },
        { label: 'Section A Url B', app: 'TestA', path: '/url-b' },
      ],
    },
    {
      label: 'Test B',
      sortKey: 200,
      entries: [
        { label: 'Section B Url A', app: 'TestB', path: '/url-a' },
        { label: 'Section B Url B', app: 'TestB', path: '/url-b' },
      ],
    },
  ])
);

describe('Page template', () => {
  it('Provides a working lazy wrapper', () => {
    const LazyObservabilityPageTemplate = createLazyObservabilityPageTemplate({
      currentAppId$: of('Test app ID'),
      getUrlForApp: () => '/test-url',
      navigateToApp: async () => {},
      navigationSections$: navigationRegistry.sections$,
      getPageTemplateServices,
      isSidebarEnabled$: new BehaviorSubject<boolean>(true),
    });

    const component = shallow(
      <LazyObservabilityPageTemplate
        pageHeader={{
          pageTitle: 'Test title',
          rightSideItems: [<span>Test side item</span>],
        }}
      >
        <div>Test structure</div>
      </LazyObservabilityPageTemplate>
    );

    expect(component.exists('lazy')).toBe(true);
  });

  it('Utilises the KibanaPageTemplate for rendering', () => {
    const component = shallow(
      <ObservabilityPageTemplate
        currentAppId$={of('Test app ID')}
        getUrlForApp={() => '/test-url'}
        navigateToApp={async () => {}}
        navigationSections$={navigationRegistry.sections$}
        pageHeader={{
          pageTitle: 'Test title',
          rightSideItems: [<span>Test side item</span>],
        }}
        getPageTemplateServices={getPageTemplateServices}
      >
        <div>Test structure</div>
      </ObservabilityPageTemplate>
    );

    expect(component.is('KibanaPageTemplate'));
  });

  it('Handles outputting the registered navigation structures within a side nav', () => {
    const { container } = render(
      <I18nProvider>
        <ObservabilityPageTemplate
          currentAppId$={of('Test app ID')}
          getUrlForApp={() => '/test-url'}
          navigateToApp={async () => {}}
          navigationSections$={navigationRegistry.sections$}
          pageHeader={{
            pageTitle: 'Test title',
            rightSideItems: [<span>Test side item</span>],
          }}
          getPageTemplateServices={getPageTemplateServices}
        >
          <div>Test structure</div>
        </ObservabilityPageTemplate>
      </I18nProvider>
    );

    expect(container).toHaveTextContent('Section A Url A');
    expect(container).toHaveTextContent('Section A Url B');
    expect(container).toHaveTextContent('Section B Url A');
    expect(container).toHaveTextContent('Section B Url B');
  });

  describe('solution view switch callout', () => {
    const templateProps = {
      currentAppId$: of('Test app ID'),
      getUrlForApp: () => '/test-url',
      navigateToApp: async () => {},
      navigationSections$: navigationRegistry.sections$,
      getPageTemplateServices,
    };

    const MockSolutionViewSwitchCallout = () => <div data-test-subj="solutionViewSwitchCallout" />;

    beforeEach(() => {
      jest.clearAllMocks();
      mockNotifications.tours.isEnabled.mockReturnValue(true);
      mockApplication.capabilities = {
        ...mockApplication.capabilities,
        spaces: { manage: true },
      };
      mockSpaces.ui.components.getSolutionViewSwitchCallout = MockSolutionViewSwitchCallout;
    });

    it('renders SolutionViewSwitchCallout when all conditions are met', () => {
      const { getByTestId } = render(
        <I18nProvider>
          <ObservabilityPageTemplate {...templateProps}>
            <div>Test</div>
          </ObservabilityPageTemplate>
        </I18nProvider>
      );

      expect(getByTestId('solutionViewSwitchCallout')).toBeInTheDocument();
    });

    it('does not render SolutionViewSwitchCallout when announcements are disabled', () => {
      mockNotifications.tours.isEnabled.mockReturnValue(false);

      const { queryByTestId } = render(
        <I18nProvider>
          <ObservabilityPageTemplate {...templateProps}>
            <div>Test</div>
          </ObservabilityPageTemplate>
        </I18nProvider>
      );

      expect(queryByTestId('solutionViewSwitchCallout')).not.toBeInTheDocument();
    });

    it('does not render SolutionViewSwitchCallout when canManageSpaces is false', () => {
      mockApplication.capabilities = {
        ...mockApplication.capabilities,
        spaces: { manage: false },
      };

      const { queryByTestId } = render(
        <I18nProvider>
          <ObservabilityPageTemplate {...templateProps}>
            <div>Test</div>
          </ObservabilityPageTemplate>
        </I18nProvider>
      );

      expect(queryByTestId('solutionViewSwitchCallout')).not.toBeInTheDocument();
    });
  });
});
