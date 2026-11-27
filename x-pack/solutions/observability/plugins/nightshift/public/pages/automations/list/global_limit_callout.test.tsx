/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationQuotasResponse } from '@kbn/nightshift-investigations-plugin/common';
import { GlobalLimitCallout } from './global_limit_callout';
import { getAutomationBlockingLimit } from '../utils/filter_automations';

const quotas = ({
  enabled = true,
  limit = 3,
  used = 3,
  totalLimit = 10,
  totalUsed = 0,
}: {
  enabled?: boolean;
  limit?: number | null;
  used?: number;
  totalLimit?: number | null;
  totalUsed?: number;
}): InvestigationQuotasResponse => ({
  enabled,
  limits: {
    automatic_investigation: limit,
    manual_investigation: 5,
    total_investigation: totalLimit,
  },
  counts: {
    automatic_investigation: used,
    manual_investigation: 0,
    total_investigation: totalUsed,
  },
  window: {
    start: '2026-09-03T00:00:00.000Z',
    resetsAt: '2026-09-04T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage: true,
});

describe('GlobalLimitCallout', () => {
  it('renders the settings link when given an href', () => {
    render(
      <I18nProvider>
        <GlobalLimitCallout
          group="automatic_investigation"
          limit={10}
          settingsHref="/app/nightshift/settings/investigations"
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('automationsGlobalLimitSettingsLink')).toHaveAttribute(
      'href',
      '/app/nightshift/settings/investigations'
    );
  });
});

describe('getAutomationBlockingLimit', () => {
  it.each([
    [undefined, undefined],
    [quotas({ used: 2 }), undefined],
    [quotas({ used: 3 }), 'automatic_investigation'],
    [quotas({ used: 5 }), 'automatic_investigation'],
    [quotas({ limit: null, used: 5 }), undefined],
    [quotas({ enabled: false }), undefined],
    [quotas({ used: 0, totalUsed: 10 }), 'total_investigation'],
    [quotas({ used: 3, totalUsed: 10 }), 'total_investigation'],
    [quotas({ used: 0, totalLimit: null, totalUsed: 50 }), undefined],
  ])('%j -> %s', (input, expected) => {
    expect(getAutomationBlockingLimit(input)).toBe(expected);
  });
});
