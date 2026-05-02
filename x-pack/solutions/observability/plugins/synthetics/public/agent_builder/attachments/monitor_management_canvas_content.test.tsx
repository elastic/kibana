/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { ConfigKey } from '../../../common/runtime_types';
import {
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../common/runtime_types/monitor_management/monitor_configs';
import type { MonitorAttachmentData } from '../../../common/agent_builder';
import { SYNTHETICS_API_URLS } from '../../../common/constants/synthetics/rest_api';
import { MonitorManagementCanvasContent } from './monitor_management_canvas_content';

const buildMonitor = (overrides: Partial<MonitorAttachmentData> = {}): MonitorAttachmentData => ({
  [ConfigKey.NAME]: 'Smoke check',
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.ENABLED]: true,
  [ConfigKey.SCHEDULE]: { number: '5', unit: ScheduleUnit.MINUTES },
  [ConfigKey.LOCATIONS]: [{ id: 'us_central', label: 'US Central', isServiceManaged: true }],
  [ConfigKey.URLS]: 'https://example.com',
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
  [ConfigKey.TAGS]: ['smoke', 'prod'],
  ...overrides,
});

interface MountResult {
  registerActionButtons: jest.Mock;
  updateOrigin: jest.Mock;
  closeCanvas: jest.Mock;
  http: HttpStart;
  application: ApplicationStart;
}

const buildHttp = (overrides?: { post?: jest.Mock; put?: jest.Mock }): HttpStart => {
  return {
    post: overrides?.post ?? jest.fn(async () => ({ id: 'created-id' })),
    put: overrides?.put ?? jest.fn(async () => ({ id: 'updated-id' })),
  } as unknown as HttpStart;
};

interface ApplicationOverrides {
  capabilities?: { uptime?: { save?: boolean; elasticManagedLocationsEnabled?: boolean } };
  getUrlForApp?: ApplicationStart['getUrlForApp'];
  navigateToUrl?: ApplicationStart['navigateToUrl'];
}

const buildApplication = (overrides?: ApplicationOverrides): ApplicationStart => {
  return {
    capabilities: overrides?.capabilities ?? {
      uptime: { save: true, elasticManagedLocationsEnabled: true },
    },
    getUrlForApp: overrides?.getUrlForApp ?? jest.fn(() => '/app/synthetics'),
    navigateToUrl: overrides?.navigateToUrl ?? jest.fn(),
  } as unknown as ApplicationStart;
};

const mount = (
  data: MonitorAttachmentData,
  options: {
    http?: HttpStart;
    application?: ApplicationStart;
    registerActionButtons?: jest.Mock;
    updateOrigin?: jest.Mock;
    closeCanvas?: jest.Mock;
  } = {}
): MountResult => {
  const registerActionButtons = options.registerActionButtons ?? jest.fn();
  const updateOrigin = options.updateOrigin ?? jest.fn(async () => undefined);
  const closeCanvas = options.closeCanvas ?? jest.fn();
  const http = options.http ?? buildHttp();
  const application = options.application ?? buildApplication();

  render(
    <MonitorManagementCanvasContent
      data={data}
      http={http}
      application={application}
      registerActionButtons={registerActionButtons}
      updateOrigin={updateOrigin}
      closeCanvas={closeCanvas}
    />
  );

  return { registerActionButtons, updateOrigin, closeCanvas, http, application };
};

const getActionFooter = (): HTMLElement =>
  screen.getByTestId('syntheticsMonitorAttachmentCanvasActions');

const getActionLabels = (): string[] =>
  within(getActionFooter())
    .getAllByRole('button')
    .map((button) => button.textContent?.trim() ?? '');

describe('MonitorManagementCanvasContent — header + details panel', () => {
  it('renders the tile wrapper, status dot, title, URL link, caption, and chip-row details', () => {
    mount(buildMonitor());
    expect(screen.getByTestId('syntheticsMonitorAttachmentCanvas')).toHaveAttribute(
      'data-test-status',
      'proposed'
    );
    // Fixed-height tile wrapper that hosts the status-tinted card.
    expect(screen.getByTestId('syntheticsMonitorAttachmentCanvasTile')).toBeInTheDocument();
    expect(
      screen.getByTestId('syntheticsMonitorAttachmentStatusDot-proposed')
    ).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsMonitorAttachmentCanvasTitle')).toHaveTextContent(
      'Smoke check'
    );
    // URL is rendered as a real link in the subtitle line; the `href`
    // attribute is the source of truth for navigation.
    expect(screen.getByTestId('syntheticsMonitorAttachmentCanvasUrl')).toHaveAttribute(
      'href',
      'https://example.com'
    );
    expect(screen.getByTestId('syntheticsMonitorAttachmentCanvasCaption')).toHaveTextContent(
      'Draft monitor — not yet saved to Synthetics.'
    );
    // The chip row lives in the tile's details block (single render, no
    // hidden duplicates now that we no longer go through `<Metric>`).
    const details = screen.getByTestId('syntheticsMonitorAttachmentCanvasDetails');
    expect(within(details).getByTestId('syntheticsMonitorAttachmentType')).toHaveTextContent(
      'HTTP'
    );
    expect(details).toHaveTextContent('Every 5 m');
    expect(details).toHaveTextContent('US Central (Elastic-managed)');
  });

  it('renders the CLI-managed callout for project-origin monitors and only a "View" action', () => {
    mount(
      buildMonitor({
        [ConfigKey.CONFIG_ID]: 'cli-id',
        [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
      })
    );
    expect(
      screen.getByTestId('syntheticsMonitorAttachmentCanvasCliManagedCallout')
    ).toBeInTheDocument();
    expect(getActionLabels()).toEqual(['View in Synthetics']);
  });

  it('falls back to a placeholder title when the monitor has no name', () => {
    mount(buildMonitor({ [ConfigKey.NAME]: '' as unknown as string }));
    expect(screen.getByTestId('syntheticsMonitorAttachmentCanvasTitle')).toHaveTextContent(
      'Untitled monitor'
    );
  });
});

describe('MonitorManagementCanvasContent — proposed monitor (Create)', () => {
  it('renders a single Create button (primary, save icon) when capabilities allow it', () => {
    mount(buildMonitor());
    expect(getActionLabels()).toEqual(['Create']);
    const createButton = screen.getByTestId('syntheticsMonitorAttachmentCanvasAction-save');
    expect(createButton).toBeEnabled();
    expect(createButton).toHaveTextContent('Create');
  });

  it('disables Create with a missing-privilege tooltip when uptime.save is false', () => {
    mount(buildMonitor(), {
      application: buildApplication({
        capabilities: { uptime: { save: false, elasticManagedLocationsEnabled: true } },
      }),
    });
    const createButton = screen.getByTestId('syntheticsMonitorAttachmentCanvasAction-save');
    expect(createButton).toBeDisabled();
    // Disabled-reason text is rendered by the wrapping EuiToolTip on
    // hover; we deliberately don't drive that interaction here because
    // EuiToolTip lazy-mounts the visible bubble in a portal and the
    // assertion is then fragile. The disabled state is what matters
    // for behaviour; the tooltip wiring is unit-tested upstream in EUI.
  });

  it('disables Create when Elastic-managed locations are disabled and the draft uses one', () => {
    mount(buildMonitor(), {
      application: buildApplication({
        capabilities: { uptime: { save: true, elasticManagedLocationsEnabled: false } },
      }),
    });
    const createButton = screen.getByTestId('syntheticsMonitorAttachmentCanvasAction-save');
    expect(createButton).toBeDisabled();
  });

  it('on click, POSTs the monitor, calls updateOrigin with the new id, and closes the canvas', async () => {
    const post = jest.fn(async () => ({ id: 'new-config-id' }));
    const updateOrigin = jest.fn(async () => undefined);
    const closeCanvas = jest.fn();

    mount(buildMonitor(), {
      http: buildHttp({ post }),
      updateOrigin,
      closeCanvas,
    });

    await act(async () => {
      await userEvent.click(screen.getByTestId('syntheticsMonitorAttachmentCanvasAction-save'));
    });

    expect(post).toHaveBeenCalledWith(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS, expect.any(Object));
    expect(updateOrigin).toHaveBeenCalledWith('new-config-id');
    expect(closeCanvas).toHaveBeenCalledTimes(1);
  });

  it('renders a "Save failed" callout when the POST throws', async () => {
    const post = jest.fn(async () => {
      throw new Error('Network down');
    });
    const closeCanvas = jest.fn();
    mount(buildMonitor(), {
      http: buildHttp({ post }),
      closeCanvas,
    });

    await act(async () => {
      await userEvent.click(screen.getByTestId('syntheticsMonitorAttachmentCanvasAction-save'));
    });

    expect(closeCanvas).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('syntheticsMonitorAttachmentCanvasSaveError')).toHaveTextContent(
        'Network down'
      );
    });
  });

  it('renders the location-warnings callout on partial-failure save and keeps canvas open', async () => {
    const post = jest.fn(async () => ({
      attributes: {
        message: 'Some locations failed',
        id: 'partial-id',
        errors: [{ locationId: 'us_east', error: { message: 'Fleet agent offline' } }],
      },
    }));
    const updateOrigin = jest.fn(async () => undefined);
    const closeCanvas = jest.fn();

    mount(buildMonitor(), {
      http: buildHttp({ post }),
      updateOrigin,
      closeCanvas,
    });

    await act(async () => {
      await userEvent.click(screen.getByTestId('syntheticsMonitorAttachmentCanvasAction-save'));
    });

    expect(updateOrigin).toHaveBeenCalledWith('partial-id');
    expect(closeCanvas).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.getByTestId('syntheticsMonitorAttachmentCanvasLocationWarnings')
      ).toHaveTextContent('Fleet agent offline');
    });
  });
});

describe('MonitorManagementCanvasContent — saved monitor (Update + View)', () => {
  it('renders Update (primary) and View (secondary) for an enabled saved monitor', () => {
    mount(buildMonitor({ [ConfigKey.CONFIG_ID]: 'saved-config-id' }));
    expect(getActionLabels()).toEqual(['Update', 'View in Synthetics']);
  });

  it('on Update click, PUTs to /api/synthetics/monitors/{configId} and does NOT call updateOrigin', async () => {
    const put = jest.fn(async () => ({ id: 'saved-config-id' }));
    const updateOrigin = jest.fn(async () => undefined);
    const closeCanvas = jest.fn();

    mount(buildMonitor({ [ConfigKey.CONFIG_ID]: 'saved-config-id' }), {
      http: buildHttp({ put }),
      updateOrigin,
      closeCanvas,
    });

    await act(async () => {
      await userEvent.click(screen.getByTestId('syntheticsMonitorAttachmentCanvasAction-save'));
    });

    expect(put).toHaveBeenCalledWith(
      `${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/saved-config-id`,
      expect.any(Object)
    );
    expect(updateOrigin).not.toHaveBeenCalled();
    expect(closeCanvas).toHaveBeenCalledTimes(1);
  });

  it('on View click, navigates to the monitor details page in the synthetics app', async () => {
    const navigateToUrl = jest.fn();
    const closeCanvas = jest.fn();
    mount(buildMonitor({ [ConfigKey.CONFIG_ID]: 'saved-config-id' }), {
      application: buildApplication({
        capabilities: { uptime: { save: true, elasticManagedLocationsEnabled: true } },
        getUrlForApp: jest.fn(() => '/app/synthetics'),
        navigateToUrl,
      }),
      closeCanvas,
    });

    await act(async () => {
      await userEvent.click(screen.getByTestId('syntheticsMonitorAttachmentCanvasAction-popout'));
    });

    expect(navigateToUrl).toHaveBeenCalledWith('/app/synthetics/monitor/saved-config-id');
    expect(closeCanvas).toHaveBeenCalledTimes(1);
  });
});

describe('MonitorManagementCanvasContent — framework header (T7 hot-fix #4)', () => {
  /**
   * Earlier iterations registered Create/Update/View on the framework's
   * flyout header. T7 hot-fix #4 moved them into the body footer (see
   * `useMonitorCanvasActions`). The framework may have leftover dynamic
   * buttons from a previous attachment, so we still call
   * `registerActionButtons` — but exactly once with `[]` to clear them.
   */
  it('clears the framework header by registering an empty button array on mount', async () => {
    const registerActionButtons = jest.fn();
    mount(buildMonitor(), { registerActionButtons });

    await waitFor(() => {
      expect(registerActionButtons).toHaveBeenCalledTimes(1);
    });
    expect(registerActionButtons).toHaveBeenCalledWith([]);
  });
});
