/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import type { ChromeStart } from '@kbn/core/public';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { ClassicPageTemplate, ClassicPageTemplateProps } from '../../types';
import { ClassicPageTemplateHost, resolveClassicPageTemplate } from './classic_page_template_host';

const Template: ClassicPageTemplate = ({ selectedId, children }: ClassicPageTemplateProps) => (
  <div data-test-subj="securityPageTemplate" data-selected-id={selectedId}>
    {children}
  </div>
);

const renderAt = (pathname: string, template?: ClassicPageTemplate) =>
  render(
    <Router history={createMemoryHistory({ initialEntries: [pathname] })}>
      <ClassicPageTemplateHost template={template}>
        <div data-test-subj="alertZeroPage" />
      </ClassicPageTemplateHost>
    </Router>
  );

type ChromeStyle = ReturnType<ChromeStart['getChromeStyle']>;

describe('resolveClassicPageTemplate', () => {
  const resolve = ({
    style,
    styleOnceSpaceLoads,
    spaceError,
  }: {
    style: ChromeStyle;
    styleOnceSpaceLoads?: ChromeStyle;
    spaceError?: boolean;
  }) => {
    let chromeStyle = style;
    const spaces = spacesPluginMock.createStartContract();
    spaces.getActiveSpace.mockImplementation(async () => {
      if (styleOnceSpaceLoads) chromeStyle = styleOnceSpaceLoads;
      if (spaceError) throw new Error('space not found');
      return { id: DEFAULT_SPACE_ID, name: 'Default', disabledFeatures: [] };
    });
    return resolveClassicPageTemplate({
      template: Template,
      chrome: { getChromeStyle: () => chromeStyle },
      spaces,
    });
  };

  it('should use the template when the chrome is Classic', async () => {
    await expect(resolve({ style: 'classic' })).resolves.toBe(Template);
  });

  it('should not use the template when the chrome is project', async () => {
    await expect(resolve({ style: 'project' })).resolves.toBeUndefined();
  });

  it('should read the chrome style after the active space has loaded', async () => {
    await expect(
      resolve({ style: 'classic', styleOnceSpaceLoads: 'project' })
    ).resolves.toBeUndefined();
  });

  it('should keep the current chrome style when the active space cannot be read', async () => {
    await expect(resolve({ style: 'classic', spaceError: true })).resolves.toBe(Template);
  });

  it('should not use a template when none is registered', async () => {
    await expect(
      resolveClassicPageTemplate({ chrome: { getChromeStyle: () => 'classic' } })
    ).resolves.toBeUndefined();
  });
});

describe('ClassicPageTemplateHost', () => {
  it('should render the page on its own when no template is set', () => {
    renderAt('/');

    expect(screen.getByTestId('alertZeroPage')).toBeInTheDocument();
    expect(screen.queryByTestId('securityPageTemplate')).not.toBeInTheDocument();
  });

  it.each([
    ['/', 'alertzero:home'],
    ['/escalations', 'alertzero:escalations'],
    ['/watches/system-security-watch-floor', 'alertzero:watches'],
  ])('should select the entry of %s when rendering inside the template', (path, selectedId) => {
    renderAt(path, Template);

    expect(screen.getByTestId('securityPageTemplate')).toHaveAttribute(
      'data-selected-id',
      selectedId
    );
    expect(screen.getByTestId('alertZeroPage')).toBeInTheDocument();
  });
});
