/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { ClassicPageTemplateProps } from '@kbn/alertzero-plugin/public';
import { createSecurityClassicPageTemplate } from '.';

const mockIsSecuritySolutionAccessible = jest.fn();
jest.mock('../../../../helpers_access', () => ({
  isSecuritySolutionAccessible: () => mockIsSecuritySolutionAccessible(),
}));

jest.mock('./security_classic_page_template', () => ({
  SecurityClassicPageTemplate: ({ selectedId, children }: ClassicPageTemplateProps) => (
    <div data-test-subj="securityClassicPageTemplate" data-selected-id={selectedId}>
      {children}
    </div>
  ),
}));

const renderTemplate = () => {
  const getStartServices = jest.fn().mockResolvedValue([coreMock.createStart(), {}, {}]);
  const Template = createSecurityClassicPageTemplate(getStartServices);
  render(
    <Template selectedId="alertzero:escalations">
      <div data-test-subj="hostPage" />
    </Template>
  );
};

describe('createSecurityClassicPageTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the host page inside the Security template when Security is accessible', async () => {
    mockIsSecuritySolutionAccessible.mockReturnValue(true);
    renderTemplate();

    expect(await screen.findByTestId('securityClassicPageTemplate')).toHaveAttribute(
      'data-selected-id',
      'alertzero:escalations'
    );
    expect(screen.getByTestId('hostPage')).toBeInTheDocument();
  });

  it('should render the host page on its own when Security is not accessible', async () => {
    mockIsSecuritySolutionAccessible.mockReturnValue(false);
    renderTemplate();

    expect(await screen.findByTestId('hostPage')).toBeInTheDocument();
    expect(screen.queryByTestId('securityClassicPageTemplate')).not.toBeInTheDocument();
  });
});
