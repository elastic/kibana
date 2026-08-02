/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  PND_AUTONOMY_URL,
  PND_PROPOSALS_AUTO_RESPOND_URL,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  WATCHES_SEED,
  WATCH_AUTONOMY_LEVELS,
  type GetAutonomyResponse,
  type Watch,
  type WatchAutonomyLevel,
} from '@kbn/pnd-common';
import { createHttpFetchError } from '../../../test_helpers/create_http_fetch_error';
import {
  createPndTestServices,
  renderWithPndProviders,
  type PndTestServices,
} from '../../../test_helpers/render_with_providers';
import { AutonomyControl } from './autonomy_control';

/**
 * `WatchesSectionLayout` renders `AppHeader`, which reads the Chrome service directly — and that
 * context only exists under `coreStart.rendering.addContext`, which no unit test mounts. Stubbing
 * the header is the repo's convention for a page test that is not about the header itself (see
 * `cloud_security_posture/public/pages/rules/rules.test.tsx`); `@kbn/core-chrome-browser-context` is
 * `platform/private`, so a security plugin cannot provide the real context here.
 */
jest.mock('@kbn/app-header', () => ({
  __esModule: true,
  AppHeader: () => null,
}));

const deepWatch = WATCHES_SEED.find(({ id }) => id === SYSTEM_SECURITY_WATCH_FLOOR_ID) as Watch;

/**
 * `AutonomySlider` is an `EuiRange` over the scale's **index**, so a level reads back as its
 * position: manual → '0', assisted → '1', supervised → '2'.
 */
const sliderValue = (level: WatchAutonomyLevel): string =>
  String(WATCH_AUTONOMY_LEVELS.indexOf(level));

const autonomyResponse = (autonomyLevel: WatchAutonomyLevel): GetAutonomyResponse => ({
  autoAccept: {
    incident_contained: false,
    open_investigation: autonomyLevel !== 'manual',
    promote_incident: autonomyLevel === 'supervised',
  },
  autonomyLevel,
  watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
});

const withPersistedLevel = (
  autonomyLevel: WatchAutonomyLevel,
  { canManage = true }: { canManage?: boolean } = {}
): PndTestServices => {
  const services = createPndTestServices({
    pndCapabilities: canManage ? { manageAutonomy: true, show: true } : { show: true },
  });
  services.http.get.mockResolvedValue(autonomyResponse(autonomyLevel));
  return services;
};

const renderControl = (watch: Watch, services: PndTestServices) =>
  renderWithPndProviders(<AutonomyControl watch={watch} />, { services });

const slider = (): HTMLElement => screen.getByRole('slider');

describe('AutonomyControl', () => {
  it('reads the level from GET /internal/pnd/autonomy for this watch', async () => {
    const services = withPersistedLevel('manual');

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toHaveValue(sliderValue('manual')));

    expect(services.http.get).toHaveBeenCalledWith(
      PND_AUTONOMY_URL,
      expect.objectContaining({ query: { watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID } })
    );
  });

  it.each([...WATCH_AUTONOMY_LEVELS])('shows the persisted level "%s"', async (level) => {
    renderControl(deepWatch, withPersistedLevel(level));

    await waitFor(() => expect(slider()).toHaveValue(sliderValue(level)));
  });

  it('names the persisted level, so the dial reads as words rather than a position', async () => {
    renderControl(deepWatch, withPersistedLevel('supervised'));

    expect(await screen.findByTestId('pndAutonomyDescription')).toBeInTheDocument();
  });

  it('disables the dial for a user without pnd_manage_autonomy', async () => {
    renderControl(deepWatch, withPersistedLevel('manual', { canManage: false }));

    await waitFor(() => expect(slider()).toBeDisabled());
  });

  it('explains why the dial is read-only for a user without pnd_manage_autonomy', async () => {
    renderControl(deepWatch, withPersistedLevel('manual', { canManage: false }));

    expect(await screen.findByTestId('pndAutonomyReadOnlyNote')).toBeInTheDocument();
  });

  it('enables the dial for a user who holds pnd_manage_autonomy', async () => {
    renderControl(deepWatch, withPersistedLevel('manual'));

    await waitFor(() => expect(slider()).toBeEnabled());
  });

  it('offers no Apply button until the level actually changes', async () => {
    renderControl(deepWatch, withPersistedLevel('manual'));

    await waitFor(() => expect(slider()).toBeEnabled());
    expect(screen.queryByTestId('pndAutonomyApply')).not.toBeInTheDocument();
  });

  it('writes the new level with PUT /internal/pnd/autonomy', async () => {
    const services = withPersistedLevel('manual');
    services.http.put.mockResolvedValue(autonomyResponse('assisted'));

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toBeEnabled());
    fireEvent.change(slider(), { target: { value: sliderValue('assisted') } });
    fireEvent.click(await screen.findByTestId('pndAutonomyApply'));

    await waitFor(() =>
      expect(services.http.put).toHaveBeenCalledWith(PND_AUTONOMY_URL, {
        body: JSON.stringify({
          autonomyLevel: 'assisted',
          watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
        }),
        version: '1',
      })
    );
  });

  it('confirms the change with a success toast', async () => {
    const services = withPersistedLevel('manual');
    services.http.put.mockResolvedValue(autonomyResponse('assisted'));

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toBeEnabled());
    fireEvent.change(slider(), { target: { value: sliderValue('assisted') } });
    fireEvent.click(await screen.findByTestId('pndAutonomyApply'));

    await waitFor(() => expect(services.notifications.toasts.addSuccess).toHaveBeenCalled());
  });

  // `PUT /internal/pnd/autonomy` is the only writer. Mirroring the applied level back into the watch's
  // settings would mean a second write through `PATCH /internal/pnd/watches/{watchId}`, which carries
  // `pnd_write` rather than `pnd_manage_autonomy` — and now rejects `autonomyLevel` for that reason.
  it('does not mirror the applied level through the watches PATCH route', async () => {
    const services = withPersistedLevel('manual');
    services.http.put.mockResolvedValue(autonomyResponse('assisted'));

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toBeEnabled());
    fireEvent.change(slider(), { target: { value: sliderValue('assisted') } });
    fireEvent.click(await screen.findByTestId('pndAutonomyApply'));
    await waitFor(() => expect(services.notifications.toasts.addSuccess).toHaveBeenCalled());

    expect(services.http.patch).not.toHaveBeenCalled();
  });

  it('surfaces a denied write as a danger toast rather than silently discarding the change', async () => {
    const services = withPersistedLevel('manual');
    services.http.put.mockRejectedValue(
      createHttpFetchError({ body: { message: 'Forbidden' }, status: 403 })
    );

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toBeEnabled());
    fireEvent.change(slider(), { target: { value: sliderValue('supervised') } });
    fireEvent.click(await screen.findByTestId('pndAutonomyApply'));

    await waitFor(() => expect(services.notifications.toasts.addDanger).toHaveBeenCalled());
  });

  it('offers a sweep after a raise, because a raise alone does not resume pending gates', async () => {
    const services = withPersistedLevel('manual');
    services.http.put.mockResolvedValue(autonomyResponse('supervised'));

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toBeEnabled());
    fireEvent.change(slider(), { target: { value: sliderValue('supervised') } });
    fireEvent.click(await screen.findByTestId('pndAutonomyApply'));

    expect(await screen.findByTestId('pndAutonomySweepPrompt')).toBeInTheDocument();
  });

  it('does not offer a sweep after lowering the level, which can never auto-accept anything new', async () => {
    const services = withPersistedLevel('supervised');
    services.http.put.mockResolvedValue(autonomyResponse('manual'));

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toBeEnabled());
    fireEvent.change(slider(), { target: { value: sliderValue('manual') } });
    fireEvent.click(await screen.findByTestId('pndAutonomyApply'));

    await waitFor(() => expect(services.notifications.toasts.addSuccess).toHaveBeenCalled());
    expect(screen.queryByTestId('pndAutonomySweepPrompt')).not.toBeInTheDocument();
  });

  it('auto-responds with POST /internal/pnd/proposals/_auto_respond when the offer is accepted', async () => {
    const services = withPersistedLevel('manual');
    services.http.put.mockResolvedValue(autonomyResponse('supervised'));
    services.http.post.mockResolvedValue({ approved: 1, skipped: 2 });

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toBeEnabled());
    fireEvent.change(slider(), { target: { value: sliderValue('supervised') } });
    fireEvent.click(await screen.findByTestId('pndAutonomyApply'));
    fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(PND_PROPOSALS_AUTO_RESPOND_URL, {
        body: JSON.stringify({ origin: 'dial', watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID }),
        version: '1',
      })
    );
  });

  it('does not sweep when the offer is declined', async () => {
    const services = withPersistedLevel('manual');
    services.http.put.mockResolvedValue(autonomyResponse('supervised'));

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toBeEnabled());
    fireEvent.change(slider(), { target: { value: sliderValue('supervised') } });
    fireEvent.click(await screen.findByTestId('pndAutonomyApply'));
    fireEvent.click(await screen.findByTestId('confirmModalCancelButton'));

    await waitFor(() =>
      expect(screen.queryByTestId('pndAutonomySweepPrompt')).not.toBeInTheDocument()
    );
    expect(services.http.post).not.toHaveBeenCalled();
  });

  it('surfaces a failed auto-respond as a danger toast, since `_auto_respond` needs a second privilege', async () => {
    const services = withPersistedLevel('manual');
    services.http.put.mockResolvedValue(autonomyResponse('supervised'));
    services.http.post.mockRejectedValue(
      createHttpFetchError({ body: { message: 'Forbidden' }, status: 403 })
    );

    renderControl(deepWatch, services);
    await waitFor(() => expect(slider()).toBeEnabled());
    fireEvent.change(slider(), { target: { value: sliderValue('supervised') } });
    fireEvent.click(await screen.findByTestId('pndAutonomyApply'));
    fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

    await waitFor(() => expect(services.notifications.toasts.addDanger).toHaveBeenCalled());
  });

  it('reads a 503 as "Workflows unavailable" rather than showing a level nobody persisted', async () => {
    const services = createPndTestServices({ pndCapabilities: { manageAutonomy: true } });
    services.http.get.mockRejectedValue(createHttpFetchError({ status: 503 }));

    renderControl(deepWatch, services);

    expect(await screen.findByTestId('pndWorkflowsUnavailableState')).toBeInTheDocument();
  });

  it('reads a 500 as a read failure, never as the most conservative level', async () => {
    const services = createPndTestServices({ pndCapabilities: { manageAutonomy: true } });
    services.http.get.mockRejectedValue(createHttpFetchError({ status: 500 }));

    renderControl(deepWatch, services);

    expect(await screen.findByTestId('pndErrorState')).toBeInTheDocument();
  });

  it('renders no slider while the autonomy read is failing, so no level can be mistaken for persisted', async () => {
    const services = createPndTestServices({ pndCapabilities: { manageAutonomy: true } });
    services.http.get.mockRejectedValue(createHttpFetchError({ status: 500 }));

    renderControl(deepWatch, services);
    await screen.findByTestId('pndErrorState');

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('shows which gates the persisted level auto-accepts', async () => {
    renderControl(deepWatch, withPersistedLevel('supervised'));

    expect(await screen.findByTestId('pndAutonomyGateFlag-promote_incident')).toBeInTheDocument();
  });

  it('never shows an alwaysGate gate as auto-accepted, even at the highest level', async () => {
    renderControl(deepWatch, withPersistedLevel('supervised'));

    expect(await screen.findByTestId('pndAutonomyGateFlag-incident_contained')).toHaveTextContent(
      'Requires approval'
    );
  });

  it('leaves a custom watch read-only, because only managed watches have a persisted level', async () => {
    const services = createPndTestServices({ pndCapabilities: { manageAutonomy: true } });

    renderControl({ ...deepWatch, id: 'custom-watch-abc', managed: false }, services);

    expect(await screen.findByTestId('pndAutonomyUnmanagedNote')).toBeInTheDocument();
  });

  it('never calls the autonomy route for a custom watch, which the route would 400', () => {
    const services = createPndTestServices({ pndCapabilities: { manageAutonomy: true } });

    renderControl({ ...deepWatch, id: 'custom-watch-abc', managed: false }, services);

    expect(services.http.get).not.toHaveBeenCalled();
  });
});
