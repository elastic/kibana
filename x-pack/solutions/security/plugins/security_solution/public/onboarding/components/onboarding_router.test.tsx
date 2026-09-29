/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ONBOARDING_PATH, SIEM_MIGRATIONS_MANAGE_PATH } from '../../../common/constants';
import { OnboardingTopicId } from '../constants';
import { OnboardingRouter } from './onboarding_router';
import { useSyncUrlDetails } from './hooks/use_url_detail';
import { useOnboardingContext } from './onboarding_context';

const mockRedirect = vi.fn((_props: unknown) => null);
vi.mock('react-router-dom', () => {
  const actual = require('react-router-dom');
  return {
    ...actual,
    Redirect: (props: unknown) => mockRedirect(props),
  };
});

vi.mock('./hooks/use_url_detail', async () => {
  const mocked = {
    ...(await vi.importActual('./hooks/use_url_detail')),
    useSyncUrlDetails: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./onboarding_context', async () => {
  const mocked = {
    ...(await vi.importActual('./onboarding_context')),
    useOnboardingContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./onboarding_header', () => {
  const mocked = {
    OnboardingHeader: () => <div data-test-subj="onboardingHeader" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./onboarding_body', () => {
  const mocked = {
    OnboardingBody: () => <div data-test-subj="onboardingBody" />,
  };
  return { ...mocked, default: mocked };
});

describe('OnboardingRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSyncUrlDetails as Mock).mockReturnValue({ isLoading: false });
    (useOnboardingContext as Mock).mockReturnValue({
      config: new Map([
        [OnboardingTopicId.siemMigrations, { id: OnboardingTopicId.siemMigrations }],
      ]),
    });
  });

  it('redirects the legacy SIEM migrations onboarding topic to the migrations manage page', () => {
    render(
      <MemoryRouter initialEntries={[`${ONBOARDING_PATH}/siem_migrations#migrate_rules`]}>
        <OnboardingRouter />
      </MemoryRouter>
    );

    expect(mockRedirect).toHaveBeenCalledWith({
      to: { pathname: SIEM_MIGRATIONS_MANAGE_PATH, hash: '#migrate_rules' },
    });
  });

  it('renders Get started for the base onboarding path', () => {
    render(
      <MemoryRouter initialEntries={[ONBOARDING_PATH]}>
        <OnboardingRouter />
      </MemoryRouter>
    );

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByTestId('onboardingHeader')).toBeInTheDocument();
    expect(screen.getByTestId('onboardingBody')).toBeInTheDocument();
  });
});
