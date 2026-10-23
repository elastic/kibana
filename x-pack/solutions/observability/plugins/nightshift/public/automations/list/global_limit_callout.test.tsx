/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RunQuotasResponse } from '@kbn/significant-events-plugin/common';
import { GlobalLimitCallout } from './global_limit_callout';
import { isGlobalInvestigationLimitReached } from '../utils/filter_automations';

const quotas = (
  overrides: Partial<Pick<RunQuotasResponse, 'enabled'>> & { limit?: number; used?: number }
) =>
  ({
    enabled: overrides.enabled ?? true,
    limits: { investigation: overrides.limit ?? 3 },
    counts: { investigation: overrides.used ?? 3 },
  } as RunQuotasResponse);

describe('GlobalLimitCallout', () => {
  it('renders the paused title', () => {
    render(
      <I18nProvider>
        <GlobalLimitCallout />
      </I18nProvider>
    );
    expect(screen.getByTestId('automationsGlobalLimitBanner')).toBeInTheDocument();
    expect(screen.queryByTestId('automationsGlobalLimitSettingsLink')).not.toBeInTheDocument();
  });

  it('renders the settings link when given an href', () => {
    render(
      <I18nProvider>
        <GlobalLimitCallout settingsHref="/app/nightshift/settings/investigations" />
      </I18nProvider>
    );
    expect(screen.getByTestId('automationsGlobalLimitSettingsLink')).toHaveAttribute(
      'href',
      '/app/nightshift/settings/investigations'
    );
  });
});

describe('isGlobalInvestigationLimitReached', () => {
  it.each([
    [undefined, false],
    [quotas({ used: 2 }), false],
    [quotas({ used: 3 }), true],
    [quotas({ used: 5 }), true],
    [quotas({ limit: 0, used: 5 }), false],
    [quotas({ enabled: false }), false],
  ])('%j -> %s', (input, expected) => {
    expect(isGlobalInvestigationLimitReached(input)).toBe(expected);
  });
});
