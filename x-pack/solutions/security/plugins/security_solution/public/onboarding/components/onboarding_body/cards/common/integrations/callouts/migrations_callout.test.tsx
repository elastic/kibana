/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, renderHook } from '@testing-library/react';
import { SecurityPageName, useNavigateTo } from '@kbn/security-solution-navigation';
import { useLocation } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '../../../../../../../common/lib/kibana';
import { useGetSecuritySolutionUrl } from '../../../../../../../common/components/link_to';
import { SIEM_MIGRATIONS_PATH } from '../../../../../../../../common/constants';
import { MigrationsCallout, useShowMigrationCallout } from './migrations_callout';

vi.mock('@kbn/security-solution-navigation', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/security-solution-navigation')),
      useNavigateTo: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useLocation: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../../../common/components/link_to', () => {
      const mocked = {
      useGetSecuritySolutionUrl: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockNavigateTo = vi.fn();
const mockGetSecuritySolutionUrl = vi.fn();

const setSiemMigrationsAvailability = ({
  rules,
  dashboards,
}: {
  rules: boolean;
  dashboards: boolean;
}) => {
  (useKibana as Mock).mockReturnValue({
    services: {
      siemMigrations: {
        rules: {
          isAvailable: vi.fn(() => rules),
        },
        dashboards: {
          isAvailable: vi.fn(() => dashboards),
        },
      },
    },
  });
};

describe('MigrationsCallout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigateTo as Mock).mockReturnValue({
      navigateTo: mockNavigateTo,
    });
    (useGetSecuritySolutionUrl as Mock).mockReturnValue(mockGetSecuritySolutionUrl);
    mockGetSecuritySolutionUrl.mockReturnValue('/app/security/siem_migrations/manage');
  });

  it('should render migrations title and start button with generated href', () => {
    const { getByRole, getByText } = render(
      <I18nProvider>
        <MigrationsCallout />
      </I18nProvider>
    );

    expect(getByText('Migrating from another SIEM?')).toBeInTheDocument();
    expect(getByText('Streamline the process with automatic migration')).toBeInTheDocument();

    expect(getByRole('link', { name: 'Start automatic migration' })).toHaveAttribute(
      'href',
      '/app/security/siem_migrations/manage'
    );
  });

  it('should navigate to SIEM migrations manage page when start button is clicked', () => {
    const { getByRole } = render(
      <I18nProvider>
        <MigrationsCallout />
      </I18nProvider>
    );

    fireEvent.click(getByRole('link', { name: 'Start automatic migration' }));

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.siemMigrationsManage,
    });
  });
});

describe('useShowMigrationCallout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useLocation as Mock).mockReturnValue({
      pathname: '/app/security',
    });
    setSiemMigrationsAvailability({
      rules: true,
      dashboards: false,
    });
  });

  it('should return true when SIEM migrations are available and url is outside SIEM migrations path', () => {
    const { result } = renderHook(() => useShowMigrationCallout());

    expect(result.current).toBe(true);
  });

  it('should return true when dashboard migrations are available', () => {
    setSiemMigrationsAvailability({
      rules: false,
      dashboards: true,
    });

    const { result } = renderHook(() => useShowMigrationCallout());

    expect(result.current).toBe(true);
  });

  it('should return false when pathname includes SIEM migrations path', () => {
    (useLocation as Mock).mockReturnValue({
      pathname: `/app/security${SIEM_MIGRATIONS_PATH}/rules`,
    });

    const { result } = renderHook(() => useShowMigrationCallout());

    expect(result.current).toBe(false);
  });

  it('should return false when SIEM migrations are unavailable', () => {
    setSiemMigrationsAvailability({
      rules: false,
      dashboards: false,
    });

    const { result } = renderHook(() => useShowMigrationCallout());

    expect(result.current).toBe(false);
  });
});
