/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NIGHTSHIFT_UI_PRIVILEGES } from '@kbn/nightshift-shared';
import { useKibana } from '../hooks/use_kibana';
import { GeneralSettingsTab } from './general_settings_tab';

jest.mock('../hooks/use_kibana');
jest.mock('./components/apps_section', () => ({
  AppsSection: ({ canEdit }: { canEdit: boolean }) => (
    <div data-test-subj="apps-section" data-can-edit={canEdit ? 'true' : 'false'} />
  ),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const renderTab = (capabilities: {
  nightshift?: Record<string, unknown>;
  streams?: { manage: boolean };
}) => {
  mockUseKibana.mockReturnValue({
    services: { application: { capabilities } },
  } as never);

  return render(<GeneralSettingsTab />);
};

describe('GeneralSettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables Slack editing when Nightshift manage and configure are both granted', () => {
    renderTab({
      nightshift: {
        [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
        [NIGHTSHIFT_UI_PRIVILEGES.configure]: true,
      },
    });

    expect(screen.getByTestId('apps-section')).toHaveAttribute('data-can-edit', 'true');
  });

  it.each([
    {
      name: 'manage only',
      nightshift: { [NIGHTSHIFT_UI_PRIVILEGES.manage]: true },
    },
    {
      name: 'configure only',
      nightshift: { [NIGHTSHIFT_UI_PRIVILEGES.configure]: true },
    },
    {
      name: 'Streams manage only',
      nightshift: undefined,
      streams: { manage: true },
    },
  ])('keeps Slack editing disabled with $name', ({ nightshift, streams }) => {
    renderTab({ nightshift, streams });

    expect(screen.getByTestId('apps-section')).toHaveAttribute('data-can-edit', 'false');
  });
});
