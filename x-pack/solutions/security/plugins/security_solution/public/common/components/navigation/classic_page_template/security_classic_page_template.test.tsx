/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { ExperimentalFeaturesService } from '../../../experimental_features_service';
import type { SecuritySideNavContentProps } from '../security_side_nav/security_side_nav';
import { SecurityClassicPageTemplate } from './security_classic_page_template';

const mockSideNavContent = jest.fn((_: SecuritySideNavContentProps) => (
  <div data-test-subj="securitySideNavContent" />
));
jest.mock('../security_side_nav', () => ({
  SecuritySideNavContent: (props: SecuritySideNavContentProps) => mockSideNavContent(props),
}));

const renderTemplate = () => {
  const coreStart = coreMock.createStart();
  coreStart.application.getUrlForApp.mockImplementation(
    (appId: string, options?: { deepLinkId?: string }) => `/app/${appId}/${options?.deepLinkId}`
  );
  render(
    <I18nProvider>
      <SecurityClassicPageTemplate selectedId="alertzero:watches" coreStart={coreStart}>
        <div data-test-subj="hostPage" />
      </SecurityClassicPageTemplate>
    </I18nProvider>
  );
};

describe('SecurityClassicPageTemplate', () => {
  beforeAll(() => {
    ExperimentalFeaturesService.init({ experimentalFeatures: allowedExperimentalValues });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the host page next to the Security navigation with the entry it selects', () => {
    renderTemplate();

    expect(screen.getByTestId('hostPage')).toBeInTheDocument();
    expect(screen.getByTestId('securitySideNavContent')).toBeInTheDocument();
    expect(mockSideNavContent).toHaveBeenCalledWith(
      expect.objectContaining({ selectedId: 'alertzero:watches' })
    );
  });

  it('should link to Security pages without the Security URL state when outside the Security app', () => {
    renderTemplate();
    const [{ getSecuritySolutionLinkProps }] = mockSideNavContent.mock.calls[0];

    expect(getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.alerts }).href).toBe(
      '/app/securitySolutionUI/alerts'
    );
  });
});
