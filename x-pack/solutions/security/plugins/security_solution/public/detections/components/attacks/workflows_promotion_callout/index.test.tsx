/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { AttacksEventTypes } from '../../../../common/lib/telemetry';
import {
  WorkflowsPromotionCallout,
  WORKFLOWS_PROMOTION_CALLOUT_DISMISS_TEST_ID,
  WORKFLOWS_PROMOTION_CALLOUT_ENABLE_TEST_ID,
  WORKFLOWS_PROMOTION_CALLOUT_LEARN_MORE_TEST_ID,
  WORKFLOWS_PROMOTION_CALLOUT_MISSING_PRIVILEGES_TEST_ID,
  WORKFLOWS_PROMOTION_CALLOUT_TEST_ID,
} from '.';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_app_toasts');

const useKibanaMock = useKibana as jest.Mock;
const useAppToastsMockHook = useAppToasts as jest.Mock;

const STORAGE_KEY = 'securitySolution.attacksPage.workflowsPromotionCalloutDismissed.v9.5';
const DOCS_URL = 'https://docs.test/run-attack-discovery-in-a-workflow';

const createStorageMock = (initial: Record<string, unknown> = {}) => {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: jest.fn((key: string) => store.get(key)),
    set: jest.fn((key: string, value: unknown) => store.set(key, value)),
    remove: jest.fn((key: string) => store.delete(key)),
  };
};

let reportEvent: jest.Mock;
let setUiSetting: jest.Mock;
let storageMock: ReturnType<typeof createStorageMock>;
let appToasts: ReturnType<typeof useAppToastsMock.create>;
const reloadMock = jest.fn();

const originalLocation = window.location;

interface RenderOptions {
  featureAvailable?: boolean;
  spaceEnabled?: boolean;
  canSaveAdvancedSettings?: boolean;
  dismissed?: boolean;
  setRejects?: boolean;
}

const renderCallout = ({
  featureAvailable = true,
  spaceEnabled = false,
  canSaveAdvancedSettings = true,
  dismissed = false,
  setRejects = false,
}: RenderOptions = {}) => {
  reportEvent = jest.fn();
  setUiSetting = jest.fn(() =>
    setRejects ? Promise.reject(new Error('boom')) : Promise.resolve(true)
  );
  storageMock = createStorageMock(dismissed ? { [STORAGE_KEY]: true } : {});

  useKibanaMock.mockReturnValue({
    services: {
      application: { capabilities: { advancedSettings: { save: canSaveAdvancedSettings } } },
      docLinks: { links: { siem: { runAttackDiscoveryInWorkflow: DOCS_URL } } },
      featureFlags: { getBooleanValue: jest.fn(() => featureAvailable) },
      storage: storageMock,
      telemetry: { reportEvent },
      uiSettings: {
        get: jest.fn((key: string, defaultValue: unknown) =>
          key === ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING ? spaceEnabled : defaultValue
        ),
        set: setUiSetting,
      },
    },
  });

  return render(<WorkflowsPromotionCallout />);
};

describe('WorkflowsPromotionCallout', () => {
  beforeEach(() => {
    appToasts = useAppToastsMock.create();
    useAppToastsMockHook.mockReturnValue(appToasts);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    jest.clearAllMocks();
  });

  it('renders when the feature is available, the space setting is off, and it is not dismissed', () => {
    renderCallout();
    expect(screen.getByTestId(WORKFLOWS_PROMOTION_CALLOUT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(WORKFLOWS_PROMOTION_CALLOUT_ENABLE_TEST_ID)).toBeInTheDocument();
  });

  it('reports a view telemetry event when it becomes visible', () => {
    renderCallout();
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.WorkflowsPromotionCalloutAction, {
      action: 'view',
    });
  });

  it('does not render when the workflows feature is not available at the deployment level', () => {
    renderCallout({ featureAvailable: false });
    expect(screen.queryByTestId(WORKFLOWS_PROMOTION_CALLOUT_TEST_ID)).not.toBeInTheDocument();
  });

  it('does not render when workflows are already enabled for the space', () => {
    renderCallout({ spaceEnabled: true });
    expect(screen.queryByTestId(WORKFLOWS_PROMOTION_CALLOUT_TEST_ID)).not.toBeInTheDocument();
  });

  it('does not render when it has already been dismissed', () => {
    renderCallout({ dismissed: true });
    expect(screen.queryByTestId(WORKFLOWS_PROMOTION_CALLOUT_TEST_ID)).not.toBeInTheDocument();
  });

  it('shows the missing-privileges description and a Learn more link instead of the enable button without the advancedSettings save privilege', () => {
    renderCallout({ canSaveAdvancedSettings: false });
    expect(
      screen.getByTestId(WORKFLOWS_PROMOTION_CALLOUT_MISSING_PRIVILEGES_TEST_ID)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(WORKFLOWS_PROMOTION_CALLOUT_ENABLE_TEST_ID)
    ).not.toBeInTheDocument();

    const learnMore = screen.getByTestId(WORKFLOWS_PROMOTION_CALLOUT_LEARN_MORE_TEST_ID);
    expect(learnMore).toBeInTheDocument();
    expect(learnMore).toHaveAttribute('href', DOCS_URL);
    expect(learnMore).toHaveAttribute('target', '_blank');
  });

  it('reports learn_more telemetry when the Learn more link is clicked', () => {
    renderCallout({ canSaveAdvancedSettings: false });
    fireEvent.click(screen.getByTestId(WORKFLOWS_PROMOTION_CALLOUT_LEARN_MORE_TEST_ID));
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.WorkflowsPromotionCalloutAction, {
      action: 'learn_more',
    });
  });

  it('enables the setting for the space and reloads when the enable button is clicked', async () => {
    renderCallout();
    fireEvent.click(screen.getByTestId(WORKFLOWS_PROMOTION_CALLOUT_ENABLE_TEST_ID));

    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.WorkflowsPromotionCalloutAction, {
      action: 'enable',
    });
    expect(setUiSetting).toHaveBeenCalledWith(ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING, true);
    await waitFor(() => expect(reloadMock).toHaveBeenCalled());
  });

  it('shows an error toast and does not reload when enabling fails', async () => {
    renderCallout({ setRejects: true });
    fireEvent.click(screen.getByTestId(WORKFLOWS_PROMOTION_CALLOUT_ENABLE_TEST_ID));

    await waitFor(() => expect(appToasts.addError).toHaveBeenCalled());
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('dismisses, persists the dismissal, and reports telemetry when the close button is clicked', () => {
    renderCallout();
    fireEvent.click(screen.getByTestId(WORKFLOWS_PROMOTION_CALLOUT_DISMISS_TEST_ID));

    expect(screen.queryByTestId(WORKFLOWS_PROMOTION_CALLOUT_TEST_ID)).not.toBeInTheDocument();
    expect(storageMock.set).toHaveBeenCalledWith(STORAGE_KEY, true);
    expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.WorkflowsPromotionCalloutAction, {
      action: 'dismiss',
    });
  });
});
