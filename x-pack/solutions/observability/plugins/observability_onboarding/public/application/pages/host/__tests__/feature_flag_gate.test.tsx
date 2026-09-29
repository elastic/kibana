/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { screen } from '@testing-library/react';
import React from 'react';
import { useLocation } from 'react-router-dom';
import type { CoreStart } from '@kbn/core/public';
import { IS_ADD_DATA_PAGE_V2_ENABLED } from '../../../../../common/feature_flags';
import { ObservabilityOnboardingFlow } from '../../../observability_onboarding_flow';
import { buildHostPageServices, renderWithHostPageProviders } from './test_helpers';

const LocationProbe: React.FC = () => {
  const { pathname } = useLocation();
  return <div data-test-subj="locationProbe">{pathname}</div>;
};

vi.mock('../../landing', () => {
  const mocked = {
    LandingPage: () => <div data-test-subj="landingPageStub" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../linux_otel_page', () => {
  const mocked = {
    HostLinuxOtelPage: () => <div data-test-subj="hostLinuxOtelPageStub" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../linux_auto_detect_page', () => {
  const mocked = {
    HostLinuxAutoDetectPage: () => <div data-test-subj="hostLinuxAutoDetectPageStub" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../macos_otel_page', () => {
  const mocked = {
    HostMacosOtelPage: () => <div data-test-subj="hostMacosOtelPageStub" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../macos_auto_detect_page', () => {
  const mocked = {
    HostMacosAutoDetectPage: () => <div data-test-subj="hostMacosAutoDetectPageStub" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../windows_otel_page', () => {
  const mocked = {
    HostWindowsOtelPage: () => <div data-test-subj="hostWindowsOtelPageStub" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../auto_detect', () => {
  const mocked = {
    AutoDetectPage: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../otel_logs', () => {
  const mocked = {
    OtelLogsPage: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../firehose', () => {
  const mocked = {
    FirehosePage: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../otel_apm', () => {
  const mocked = {
    OtelApmPage: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../cloudforwarder', () => {
  const mocked = {
    CloudForwarderPage: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../shared/use_flow_breadcrumbs', () => {
  const mocked = {
    useFlowBreadcrumb: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../shared/use_managed_otlp_service_availability', () => {
  const mocked = {
    useManagedOtlpServiceAvailability: () => false,
  };
  return { ...mocked, default: mocked };
});

beforeAll(() => {
  window.scrollTo = vi.fn();
});

const renderFlow = (flagEnabled: boolean, path: string) => {
  const services = buildHostPageServices();
  const featureFlags = services.featureFlags as CoreStart['featureFlags'] & {
    useBooleanValue: Mock;
  };
  featureFlags.useBooleanValue.mockImplementation((id: string, fallback: boolean) =>
    id === IS_ADD_DATA_PAGE_V2_ENABLED ? flagEnabled : fallback
  );
  return renderWithHostPageProviders(
    <>
      <ObservabilityOnboardingFlow />
      <LocationProbe />
    </>,
    {
      initialEntries: [path],
      services,
    }
  );
};

const HOST_ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['/host/linux', 'hostLinuxOtelPageStub'],
  ['/host/linux/auto-detect', 'hostLinuxAutoDetectPageStub'],
  ['/host/macos', 'hostMacosOtelPageStub'],
  ['/host/macos/auto-detect', 'hostMacosAutoDetectPageStub'],
  ['/host/windows', 'hostWindowsOtelPageStub'],
] as const;

describe('Feature-flag gate on /host/* routes', () => {
  describe.each(HOST_ROUTES)('%s', (path, pageStubTestId) => {
    it('renders the host page when the flag is on', () => {
      renderFlow(true, path);
      expect(screen.getByTestId(pageStubTestId)).toBeInTheDocument();
      expect(screen.queryByTestId('landingPageStub')).toBeNull();
    });

    it('falls back to the V1 landing page when the flag is off', () => {
      renderFlow(false, path);
      expect(screen.getByTestId('landingPageStub')).toBeInTheDocument();
      expect(screen.queryByTestId(pageStubTestId)).toBeNull();
    });

    it('rewrites the URL to / when the flag is off so orphan V2 deep links normalize', () => {
      renderFlow(false, path);
      expect(screen.getByTestId('locationProbe').textContent).toBe('/');
    });
  });

  it('falls back to the V1 landing page for unmatched paths even when the flag is on', () => {
    renderFlow(true, '/some/other/unmatched/path');
    expect(screen.getByTestId('landingPageStub')).toBeInTheDocument();
    expect(screen.queryByTestId('hostLinuxOtelPageStub')).toBeNull();
  });
});
