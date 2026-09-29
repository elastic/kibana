/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { Router } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom';
import { createStore } from 'redux-v4';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { of } from 'rxjs';
import type { StartServices } from '../../../types';
import { SECURITY_FEATURE_ID } from '../../../../common/constants';
import { useConsoleManager } from '../../../management/components/console/components/console_manager';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { flyoutProviders } from './flyout_provider';

vi.mock('../../../common/components/user_privileges/user_privileges_context', () => {
  const mocked = {
    UserPrivilegesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../common/components/discover_in_timeline/provider', () => {
  const mocked = {
    DiscoverInTimelineContextProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../assistant/provider', () => {
  const mocked = {
    AssistantProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../cases/components/provider/provider', () => {
  const mocked = {
    CaseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});

const services = {
  uiActions: {
    getTriggerCompatibleActions: vi.fn().mockResolvedValue([]),
  },
  upselling: new UpsellingService(),
  data: {
    query: {
      timefilter: {
        timefilter: { getAbsoluteTime: () => ({ from: '2024-01-01', to: '2024-01-02' }) },
      },
    },
  },
  application: {
    capabilities: {
      [SECURITY_FEATURE_ID]: {
        crud: false,
        show: false,
      },
      securitySolutionTimeline: {
        read: false,
        crud: false,
      },
      securitySolutionNotes: {
        read: false,
        crud: false,
      },
    },
  },
  notifications: {
    toasts: {
      addError: vi.fn(),
      addSuccess: vi.fn(),
      addWarning: vi.fn(),
      addInfo: vi.fn(),
      remove: vi.fn(),
    },
  },
  theme: {
    getTheme: vi.fn().mockReturnValue({ darkMode: false }),
    theme$: of({ darkMode: false }),
  },
  http: {},
} as unknown as StartServices;

const LocationProbe = () => {
  const { pathname, search } = useLocation();

  return <div>{`${pathname}${search}`}</div>;
};

const ExpandableFlyoutApiProbe = () => {
  const { openPreviewPanel } = useExpandableFlyoutApi();

  return <div>{typeof openPreviewPanel}</div>;
};

const ConsoleManagerProbe = () => {
  const consoleManager = useConsoleManager();

  return <div data-test-subj="console-manager-probe">{typeof consoleManager.register}</div>;
};

describe('flyoutProviders', () => {
  it('uses the provided history when available', () => {
    const history = createMemoryHistory({ initialEntries: ['/security?foo=bar'] });
    const store = createStore(() => ({}));

    render(
      flyoutProviders({
        services,
        store,
        history,
        children: <LocationProbe />,
      })
    );

    expect(screen.getByText('/security?foo=bar')).toBeInTheDocument();
  });

  it('provides router context when no history is provided', () => {
    const store = createStore(() => ({}));

    render(
      flyoutProviders({
        services,
        store,
        children: <LocationProbe />,
      })
    );

    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('uses the existing router context when no history is provided', () => {
    const history = createMemoryHistory({ initialEntries: ['/existing-router'] });
    const store = createStore(() => ({}));

    render(
      <Router history={history}>
        {flyoutProviders({
          services,
          store,
          children: <LocationProbe />,
        })}
      </Router>
    );

    expect(screen.getByText('/existing-router')).toBeInTheDocument();
  });

  it('provides expandable flyout context to children', () => {
    const store = createStore(() => ({}));

    render(
      flyoutProviders({
        services,
        store,
        children: <ExpandableFlyoutApiProbe />,
      })
    );

    expect(screen.getByText('function')).toBeInTheDocument();
  });

  it('provides console manager context to children', () => {
    const store = createStore(() => ({}));

    render(
      flyoutProviders({
        services,
        store,
        children: <ConsoleManagerProbe />,
      })
    );

    expect(screen.getByTestId('console-manager-probe')).toHaveTextContent('function');
  });

  describe('TimeRangeSync', () => {
    const absoluteRangeAction = setAbsoluteRangeDatePicker({
      id: InputsModelId.global,
      from: '2024-01-01',
      to: '2024-01-02',
    });

    afterEach(() => {
      window.history.pushState({}, '', '/');
    });

    it('does NOT seed the global time range when on a Security app path', () => {
      window.history.pushState({}, '', '/app/security/alerts');
      const store = createStore(() => ({}));
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      render(flyoutProviders({ services, store, children: <div /> }));

      const seeded = dispatchSpy.mock.calls.some(
        ([action]) => (action as { type?: string })?.type === absoluteRangeAction.type
      );
      expect(seeded).toBe(false);
    });

    it('seeds the global time range from the timefilter when NOT on a Security app path', () => {
      window.history.pushState({}, '', '/app/discover');
      const store = createStore(() => ({}));
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      render(flyoutProviders({ services, store, children: <div /> }));

      expect(dispatchSpy).toHaveBeenCalledWith(absoluteRangeAction);
    });
  });
});
