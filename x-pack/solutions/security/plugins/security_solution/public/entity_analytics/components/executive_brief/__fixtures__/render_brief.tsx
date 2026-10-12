/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { BriefActionsProvider } from '../actions/brief_actions_context';
import type { BriefActions } from '../actions/brief_actions_context';

export const createBriefActions = (overrides: Partial<BriefActions> = {}): BriefActions => ({
  triage: jest.fn(),
  openEntity: jest.fn(),
  openThreat: jest.fn(),
  ...overrides,
});

/** Renders with the brief actions provider; pass `null` to render without one (print layouts). */
export const renderBrief = (
  ui: React.ReactElement,
  actions: BriefActions | null = createBriefActions()
): RenderResult =>
  render(ui, {
    wrapper: ({ children }) => (
      <I18nProvider>
        <BriefActionsProvider value={actions ?? undefined}>{children}</BriefActionsProvider>
      </I18nProvider>
    ),
  });
