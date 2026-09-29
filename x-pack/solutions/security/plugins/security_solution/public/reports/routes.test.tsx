/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AIValueRoutes } from './routes';

vi.mock('../common/components/plugin_template_wrapper', () => {
  const mocked = {
    PluginTemplateWrapper: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="pluginTemplateWrapper">{children}</div>
    ),
  };
  return { ...mocked, default: mocked };
});

// Simulate the upselling behavior: SecurityRoutePageWrapper can choose not to render children.
vi.mock('../common/components/security_route_page_wrapper', () => {
  const mocked = {
    SecurityRoutePageWrapper: () => <div data-test-subj="upsellPage" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./pages/ai_value', () => {
  const mocked = {
    AIValue: () => <div data-test-subj="aiValuePage" />,
  };
  return { ...mocked, default: mocked };
});

describe('AIValueRoutes', () => {
  it('renders the plugin template wrapper when the route page wrapper does not render children', () => {
    render(<AIValueRoutes />);

    expect(screen.getByTestId('pluginTemplateWrapper')).toBeInTheDocument();
  });
});
