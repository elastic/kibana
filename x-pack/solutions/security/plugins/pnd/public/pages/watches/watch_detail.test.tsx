/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route } from '@kbn/shared-ux-router';
import {
  PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
  PND_SIGNAL_DRIVEN_WATCH_TRIGGERS,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  WATCHES_SEED,
} from '@kbn/pnd-common';
import type {
  GetAutonomyResponse,
  UpdateWatchRequestBody,
  Watch,
  WatchSettings,
  WatchWorker,
} from '@kbn/pnd-common';
import type { AppHeaderProps } from '@kbn/app-header';

import { PND_INVESTIGATION_AGENT_ID } from '../../../common/constants';
import { renderWithPndProviders } from '../../components/test_utils/render_with_pnd_providers';
import { createPndTestServices } from '../../test_helpers/render_with_providers';
import * as settingsI18n from './settings_translations';
import * as workersI18n from './workers/translations';
import { WatchDetailPage } from './watch_detail';

/** `disableButton` and `tooltipContent` are each either a value or a thunk. */
const resolveDisabled = (disableButton: boolean | (() => boolean) | undefined): boolean =>
  typeof disableButton === 'function' ? disableButton() : disableButton === true;

const resolveTooltip = (
  tooltipContent: string | (() => string | undefined) | undefined
): string | undefined => (typeof tooltipContent === 'function' ? tooltipContent() : tooltipContent);

/**
 * Stands in for `AppHeader`, rendering its config as plain controls.
 *
 * The real header cannot mount here: it reads the Chrome service directly, and that context only
 * exists under `coreStart.rendering.addContext`, which no unit test mounts —
 * `@kbn/core-chrome-browser-context` is `platform/private`, so a security plugin cannot provide it.
 * Stubbing the header is the repo's convention for a page test that is not about the header itself
 * (see `cloud_security_posture/public/pages/rules/rules.test.tsx`).
 *
 * It renders the config rather than `null`, though, because this page's Save, Discard, unsaved-changes
 * badge and Enabled switch all live in the header — a stub that drops them could not answer "is Save
 * enabled?", which is most of what there is to assert about draft-until-Save.
 */
const mockAppHeader = ({ badges, menu }: AppHeaderProps) => {
  const headerSwitch = menu?.switch;
  const items = [
    ...(menu?.primaryActionItem ? [menu.primaryActionItem] : []),
    ...(menu?.items ?? []),
  ];

  return (
    <div data-test-subj="pndTestAppHeader">
      {(badges ?? []).map((badge) => (
        <span key={badge.label} data-test-subj={badge['data-test-subj']} title={badge.tooltip}>
          {badge.label}
        </span>
      ))}
      {headerSwitch != null ? (
        <input
          aria-label={headerSwitch.label}
          checked={headerSwitch.checked}
          data-test-subj={headerSwitch['data-test-subj']}
          onChange={(event) => headerSwitch.onChange(event.target.checked)}
          type="checkbox"
        />
      ) : null}
      {items.map((item) => (
        <button
          data-test-subj={item.testId}
          disabled={resolveDisabled(item.disableButton)}
          key={item.id}
          onClick={() => item.run?.()}
          title={resolveTooltip(item.tooltipContent)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

jest.mock('@kbn/app-header', () => ({
  __esModule: true,
  AppHeader: (props: AppHeaderProps) => mockAppHeader(props),
}));

/**
 * The watch reads are mocked; this suite is about the page's own wiring, not the projection.
 * `useWatches` is the subnav's list read, which the surrounding `WatchesSectionLayout` performs.
 */
jest.mock('../../hooks/use_watches_api', () => ({
  useUpdateWatch: jest.fn(),
  useWatch: jest.fn(),
  useWatches: jest.fn(),
}));

/**
 * The Workers section reads the projected catalog rather than `settings` (kibana-phf4.6), so the page
 * needs `useWorkers` mocked to control which rows, if any, belong to the watch under test.
 */
jest.mock('../../hooks/use_workers_api', () => ({
  useWorkers: jest.fn(),
}));

const { useUpdateWatch, useWatch, useWatches } = jest.requireMock('../../hooks/use_watches_api');
const { useWorkers } = jest.requireMock('../../hooks/use_workers_api');

const autonomy: GetAutonomyResponse = {
  autoAccept: { apply_tuning: false, incident_contained: false, open_investigation: false },
  autonomyLevel: 'manual',
  watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
};

const deepWatch = WATCHES_SEED.find(({ id }) => id === SYSTEM_SECURITY_WATCH_DEEP_ID) as Watch;

/**
 * PND's phase-4 watch, the one watch whose Triggers section is signal-driven.
 *
 * Which watch that is comes from `PND_SIGNAL_DRIVEN_WATCH_TRIGGERS`, and
 * `kbn-pnd-common/managed_workflow_drift.test.ts` asserts that map against the triggers the managed
 * YAML really declares — in both directions. So this suite can assert the *rendering* without also
 * having to re-assert which watch deserves it.
 */
const postIncidentWatch = WATCHES_SEED.find(
  ({ id }) => id === SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID
) as Watch;

/**
 * One editable control per settings section, so a single Save can be asserted to carry the whole
 * accumulated patch.
 *
 * ⛔ Deliberately carries **no** `approvalGates`, matching `WATCH_SETTINGS_SEED`: the 2026-08-10
 * design deleted the whole Approval gates section (bead kibana-phf4.33), and the PATCH route rejects
 * the field. `skills` is present but no longer editable — the per-row toggles went in the same
 * declutter — so the only draftable sections left are Triggers and Scope & routing.
 */
/**
 * Extracted so a test can vary one field without spreading `settings.triggers`, which is optional on
 * `WatchSettings` and therefore widens every field to `| undefined` when spread.
 */
const triggersSeed: NonNullable<WatchSettings['triggers']> = {
  allowManualRun: true,
  schedule: { optionIds: ['every-15m', 'hourly'], selectedId: 'every-15m' },
  sharedWithAttackDiscovery: false,
};

const settings: WatchSettings = {
  autonomy: 'manual',
  /**
   * `showMvpScopeWarning: true` on purpose. The 2026-08-17 simplification removed the MVP-scope callout
   * outright, so the payload asking for it and the page still not drawing it is the assertion — a
   * fixture with the flag off would pass whether or not the callout had been removed.
   */
  general: { runAsIdentity: 'svc-watch-deep', showMvpScopeWarning: true },
  runsLedger: [
    {
      action: 'draft',
      callableId: 'deep-hunt',
      event: 'Drafted an investigation — credential dumping on host-1',
      id: 'ledger-1',
      outcome: 'awaiting-review',
      time: '2026-08-03T12:00:00.000Z',
    },
  ],
  scopeRouting: {
    assigneeQueue: { optionIds: ['unassigned', 'threat-hunting'], selectedId: 'threat-hunting' },
    dataSources: { optionIds: ['alerts-only', 'alerts-entities'], selectedId: 'alerts-only' },
    escalationContact: { optionIds: ['none', 'ir-on-call'], selectedId: 'none' },
  },
  skills: [{ enabled: true, skillId: 'mitre-attack-mapping' }],
  triggers: triggersSeed,
  watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
};

/**
 * A Worker the Deep watch's lane does NOT declare, so the default render has no Workers section: Deep
 * runs no `ai.agent` step, where the retired seed attached workers to every watch.
 */
const floorWorker: WatchWorker = {
  agentId: PND_INVESTIGATION_AGENT_ID,
  agentName: 'Watch Investigator',
  id: 'open_investigation',
  phase: 'investigation',
  skillIds: ['alert-analysis'],
  watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
};

/** The same projection, attributed to the watch under test, so the Workers section renders. */
const deepWorker: WatchWorker = { ...floorWorker, watchIds: [SYSTEM_SECURITY_WATCH_DEEP_ID] };

/**
 * The copy the 2026-08-10 declutter retired, pinned as literals on purpose: the `i18n.translate`
 * messages behind both callouts are deleted (bead kibana-phf4.33), so there is no constant left to
 * import — and a test that asserted the absence of a string it also owned would pass vacuously.
 */
const RETIRED_COPY = {
  auditTrailCalloutTitle: 'Audit trail',
  skillDependenciesCalloutTitle: 'Skill dependencies',
  // Retired by the 2026-08-17 simplification and the 2026-08-13 declutter (bead kibana-phf4.27).
  adSharedCalloutTitle: 'Shared with Attack Discovery',
  disabledBadge: 'Disabled',
  enabledBadge: 'Enabled',
  generalSectionTitle: 'General',
  mvpScopeCalloutTitle: 'MVP scope',
  runAsIdentityLabel: 'Run-as identity',
  scheduleLabel: 'Schedule',
  scopeSectionTitle: 'Scope & routing',
  viewGuardrails: 'View guardrails',
};

interface SaveOptions {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

const renderWatchDetail = ({
  canManageAutonomy = false,
  saveOutcome = 'pending',
  settingsOverrides,
  watch = deepWatch,
  withSettings = true,
  workers = [floorWorker],
}: {
  canManageAutonomy?: boolean;
  /** What `useUpdateWatch` reports back for a Save: nothing yet, a 200, or a rejection. */
  saveOutcome?: 'pending' | 'error' | 'success';
  /** Fields the payload carries that the seed does not, e.g. a retired `approvalGates` array. */
  settingsOverrides?: Partial<WatchSettings>;
  /** The watch under test. Defaults to Deep; the post-incident watch is the signal-driven one. */
  watch?: Watch;
  withSettings?: boolean;
  workers?: WatchWorker[];
} = {}) => {
  const services = createPndTestServices({
    pndCapabilities: canManageAutonomy ? { manageAutonomy: true, show: true } : { show: true },
  });
  services.http.get.mockResolvedValue(autonomy);
  services.http.put.mockResolvedValue({ ...autonomy, autonomyLevel: 'assisted' });
  const updateWatch = jest.fn((_patch: UpdateWatchRequestBody, options?: SaveOptions) => {
    if (saveOutcome === 'error') {
      options?.onError?.(new Error('the store refused this row'));
    }
    if (saveOutcome === 'success') {
      options?.onSuccess?.();
    }
  });
  useUpdateWatch.mockReturnValue({ mutate: updateWatch });
  useWatches.mockReturnValue({ data: { watches: WATCHES_SEED }, isLoading: false });
  useWorkers.mockReturnValue({ data: { workers }, error: null, isLoading: false });
  useWatch.mockReturnValue({
    data: {
      settings: withSettings ? { ...settings, ...settingsOverrides, watchId: watch.id } : undefined,
      watch,
    },
    error: null,
    isLoading: false,
    refetch: jest.fn(),
  });

  /**
   * One history for both the router and `services`: the leave-confirm registers its block on the
   * history it is handed, so a second object would be blocking a router nobody navigates.
   */
  const history = createMemoryHistory({
    initialEntries: [`/watches/${watch.id}`],
  });

  return {
    // `services` is spread, because the shared wrapper takes `Record<string, unknown>`
    // and an interface has no implicit index signature
    ...renderWithPndProviders(<Route path="/watches/:watchId" component={WatchDetailPage} />, {
      history,
      services: { ...services, history },
    }),
    services,
    updateWatch,
  };
};

/** The one edit most tests need: a schedule the draft did not start on. */
const editSchedule = () =>
  fireEvent.change(screen.getByTestId('pndWatchScheduleSelect'), {
    target: { value: 'hourly' },
  });

describe('WatchDetailPage', () => {
  it('opens the run and trust ledger from "View all runs", which used to be a stub toast', () => {
    const { history } = renderWatchDetail();

    fireEvent.click(screen.getByTestId('pndWatchDetailViewAllRuns'));

    expect(history.location.pathname).toBe('/watches/activity');
  });

  it('scopes the ledger to this watch', () => {
    const { history } = renderWatchDetail();

    fireEvent.click(screen.getByTestId('pndWatchDetailViewAllRuns'));

    expect(history.location.search).toBe(`?watchId=${SYSTEM_SECURITY_WATCH_DEEP_ID}`);
  });

  it('no longer toasts "changes are not persisted" for the runs link', () => {
    const { services } = renderWatchDetail();

    fireEvent.click(screen.getByTestId('pndWatchDetailViewAllRuns'));

    expect(services.notifications.toasts.addInfo).not.toHaveBeenCalled();
  });

  it('renders the autonomy section, which reads the persisted level', () => {
    renderWatchDetail();

    expect(screen.getByTestId('pndWatchAutonomySection')).toBeInTheDocument();
  });

  /**
   * Every other section reads the in-memory store, which only answers in mock mode. Autonomy reads
   * `GET /internal/pnd/autonomy`, so it is the one section that must survive a watch with no
   * settings — otherwise the dial disappears in exactly the mode where it is the only real control.
   */
  it('still renders the autonomy section for a watch with no store-backed settings', () => {
    renderWatchDetail({ withSettings: false });

    expect(screen.getByTestId('pndWatchAutonomySection')).toBeInTheDocument();
  });

  it('drops the store-backed sections for a watch with no settings', () => {
    renderWatchDetail({ withSettings: false });

    expect(screen.queryByTestId('pndWatchRunsLedgerSection')).not.toBeInTheDocument();
  });

  /** Nothing to save on a watch with no settings, so the header offers no Save. */
  it('offers no Save for a watch with no store-backed settings', () => {
    renderWatchDetail({ withSettings: false });

    expect(screen.queryByTestId('pndWatchSettingsSave')).not.toBeInTheDocument();
  });

  /**
   * Workers are projected from the lane's real `ai.agent` steps (kibana-phf4.6), and the Deep watch
   * declares none — so the honest rendering is no section at all, where the retired `WORKERS_SEED`
   * listed workers for every watch.
   */
  it('omits the workers section for a watch whose lane runs no agent step', () => {
    renderWatchDetail();

    expect(screen.queryByTestId('pndWatchWorkersSection')).not.toBeInTheDocument();
  });

  it('renders the workers section for a watch whose lane does run one', () => {
    renderWatchDetail({
      workers: [{ ...floorWorker, watchIds: [SYSTEM_SECURITY_WATCH_DEEP_ID] }],
    });

    expect(screen.getByTestId('pndWatchWorkersSection')).toBeInTheDocument();
  });

  it("lists that watch's projected steps", () => {
    renderWatchDetail({
      workers: [deepWorker, { ...floorWorker, id: 'draft_tuning' }],
    });

    expect(screen.getByText(workersI18n.workerName(deepWorker.id))).toBeInTheDocument();
  });

  it("drops a worker projected from another watch's lane", () => {
    renderWatchDetail({
      workers: [deepWorker, { ...floorWorker, id: 'draft_tuning' }],
    });

    expect(screen.queryByText(workersI18n.workerName('draft_tuning'))).not.toBeInTheDocument();
  });

  describe('draft settings', () => {
    it('does not write when a settings field is edited', () => {
      const { updateWatch } = renderWatchDetail();

      editSchedule();

      expect(updateWatch).not.toHaveBeenCalled();
    });

    it('keeps the edit in the control while it is unsaved', () => {
      renderWatchDetail();

      editSchedule();

      expect(screen.getByTestId('pndWatchScheduleSelect')).toHaveValue('hourly');
    });

    it('writes once when Save is selected', () => {
      const { updateWatch } = renderWatchDetail();

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsSave'));

      expect(updateWatch).toHaveBeenCalledTimes(1);
    });

    /**
     * Every editable control's pending edit travels in the one PATCH body.
     *
     * Two edits, not three: this drove a `dataSources` select too until the 2026-08-17 simplification
     * deferred the Scope & routing section (bead kibana-phf4.27), leaving Triggers as the only section
     * with controls. The draft still *carries* `scopeRouting` and the PATCH still accepts it — deferred
     * is not rejected — which `helpers/watch_settings_draft` and `hooks/use_watch_settings_draft` still
     * cover directly. What no longer exists is a control to produce the edit from this page.
     */
    it('sends every pending edit in that one write', () => {
      const { updateWatch } = renderWatchDetail();

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchManualRunSwitch'));
      fireEvent.click(screen.getByTestId('pndWatchSettingsSave'));

      expect(updateWatch.mock.calls[0][0]).toEqual({
        triggers: { allowManualRun: false, scheduleId: 'hourly' },
      });
    });

    /** The corollary, stated so nobody re-adds the section by accident and finds it silently unsaved. */
    it('sends no scopeRouting, because the deferred section has no control', () => {
      const { updateWatch } = renderWatchDetail();

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsSave'));

      expect(updateWatch.mock.calls[0][0]).not.toHaveProperty('scopeRouting');
    });

    /**
     * The Skills section survives the declutter as a read-only list, so a save must never carry a
     * `skills` entry — there is no control to produce one, and the route field has no UI writer left.
     */
    it('never sends a skills entry, because no control can edit one', () => {
      const { updateWatch } = renderWatchDetail();

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsSave'));

      expect(updateWatch.mock.calls[0][0]).not.toHaveProperty('skills');
    });

    it('disables Save until something changes', () => {
      renderWatchDetail();

      expect(screen.getByTestId('pndWatchSettingsSave')).toBeDisabled();
    });

    it('says why Save is disabled', () => {
      renderWatchDetail();

      expect(screen.getByTestId('pndWatchSettingsSave')).toHaveAttribute(
        'title',
        settingsI18n.SAVE_NO_CHANGES_TOOLTIP
      );
    });

    it('enables Save once the draft differs from the saved settings', () => {
      renderWatchDetail();

      editSchedule();

      expect(screen.getByTestId('pndWatchSettingsSave')).toBeEnabled();
    });

    it('puts an edited field back when the changes are discarded', () => {
      renderWatchDetail();

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsDiscard'));

      expect(screen.getByTestId('pndWatchScheduleSelect')).toHaveValue('every-15m');
    });

    it('writes nothing when the changes are discarded', () => {
      const { updateWatch } = renderWatchDetail();

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsDiscard'));

      expect(updateWatch).not.toHaveBeenCalled();
    });
  });

  describe('unsaved changes badge', () => {
    it('badges nothing on an untouched page', () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndWatchUnsavedChangesBadge')).not.toBeInTheDocument();
    });

    it('badges the page once an edit is pending', () => {
      renderWatchDetail();

      editSchedule();

      expect(screen.getByTestId('pndWatchUnsavedChangesBadge')).toBeInTheDocument();
    });

    it('explains the badge, including which controls are never pending', () => {
      renderWatchDetail();

      editSchedule();

      expect(screen.getByTestId('pndWatchUnsavedChangesBadge')).toHaveAttribute(
        'title',
        settingsI18n.UNSAVED_CHANGES_BADGE_TOOLTIP
      );
    });

    it('drops the badge once the save lands', () => {
      renderWatchDetail({ saveOutcome: 'success' });

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsSave'));

      expect(screen.queryByTestId('pndWatchUnsavedChangesBadge')).not.toBeInTheDocument();
    });

    /**
     * The route validates the whole body before mutating anything (kibana-phf4.14), so a refused save
     * changed nothing server-side — the edits have to stay on the page rather than be rebaselined as
     * if they had landed.
     */
    it('keeps the badge when the save is refused', () => {
      renderWatchDetail({ saveOutcome: 'error' });

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsSave'));

      expect(screen.getByTestId('pndWatchUnsavedChangesBadge')).toBeInTheDocument();
    });

    it('keeps the edit in the control when the save is refused', () => {
      renderWatchDetail({ saveOutcome: 'error' });

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsSave'));

      expect(screen.getByTestId('pndWatchScheduleSelect')).toHaveValue('hourly');
    });

    it('says why the save was refused', () => {
      const { services } = renderWatchDetail({ saveOutcome: 'error' });

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsSave'));

      expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith({
        text: 'the store refused this row',
        title: settingsI18n.SAVE_FAILED,
      });
    });
  });

  describe('leaving the page with unsaved changes', () => {
    it('asks before leaving', async () => {
      const { history, services } = renderWatchDetail();

      editSchedule();
      act(() => history.push('/watches'));

      await waitFor(() =>
        expect(services.overlays.openConfirm).toHaveBeenCalledWith(
          settingsI18n.LEAVE_MODAL_BODY,
          expect.objectContaining({ title: settingsI18n.LEAVE_MODAL_TITLE })
        )
      );
    });

    it('leaves, discarding the draft, when the customer confirms', async () => {
      const { history, services } = renderWatchDetail();
      services.overlays.openConfirm.mockResolvedValue(true);

      editSchedule();
      act(() => history.push('/watches'));

      await waitFor(() =>
        expect(services.application.navigateToUrl).toHaveBeenCalledWith('/watches', {
          state: undefined,
        })
      );
    });

    it('stays on the page when the customer cancels', async () => {
      const { history, services } = renderWatchDetail();

      editSchedule();
      act(() => history.push('/watches'));
      await waitFor(() => expect(services.overlays.openConfirm).toHaveBeenCalled());

      expect(services.application.navigateToUrl).not.toHaveBeenCalled();
    });

    it('keeps the draft on the page when the customer cancels', async () => {
      const { history, services } = renderWatchDetail();

      editSchedule();
      act(() => history.push('/watches'));
      await waitFor(() => expect(services.overlays.openConfirm).toHaveBeenCalled());

      expect(screen.getByTestId('pndWatchScheduleSelect')).toHaveValue('hourly');
    });

    it('does not ask when there is nothing pending', () => {
      const { history, services } = renderWatchDetail();

      act(() => history.push('/watches'));

      expect(services.overlays.openConfirm).not.toHaveBeenCalled();
    });

    it('does not ask once the changes have been saved', () => {
      const { history, services } = renderWatchDetail({ saveOutcome: 'success' });

      editSchedule();
      fireEvent.click(screen.getByTestId('pndWatchSettingsSave'));
      act(() => history.push('/watches'));

      expect(services.overlays.openConfirm).not.toHaveBeenCalled();
    });
  });

  /**
   * The two controls that deliberately sit outside the draft. Do not "unify" them into it: the PATCH
   * route rejects `autonomyLevel` outright, and all-or-nothing (kibana-phf4.13), so one autonomy key
   * in a batched body would make a whole page of settings edits land nothing.
   */
  describe('controls that stay immediate', () => {
    /**
     * The page used to mirror the applied level into the watch's settings with
     * `updateWatch({ autonomyLevel })`. `PATCH /internal/pnd/watches/{watchId}` now rejects that
     * field — it carries `pnd_write`, not the `pnd_manage_autonomy` privilege the autonomy route is
     * gated on — so the mirror would only ever produce a 400 for a write that had already succeeded.
     */
    it('does not patch the watch after the autonomy dial persists a level', async () => {
      const { services, updateWatch } = renderWatchDetail({ canManageAutonomy: true });

      const slider = await screen.findByRole('slider');
      await waitFor(() => expect(slider).toBeEnabled());
      fireEvent.change(slider, { target: { value: '1' } });
      fireEvent.click(await screen.findByTestId('pndAutonomyApply'));
      await waitFor(() => expect(services.http.put).toHaveBeenCalled());

      expect(updateWatch).not.toHaveBeenCalled();
    });

    /** The dial writes on Apply, so it has no pending state to lose and must not arm the badge. */
    it('does not badge the page after the autonomy dial persists a level', async () => {
      const { services } = renderWatchDetail({ canManageAutonomy: true });

      const slider = await screen.findByRole('slider');
      await waitFor(() => expect(slider).toBeEnabled());
      fireEvent.change(slider, { target: { value: '1' } });
      fireEvent.click(await screen.findByTestId('pndAutonomyApply'));
      await waitFor(() => expect(services.http.put).toHaveBeenCalled());

      expect(screen.queryByTestId('pndWatchUnsavedChangesBadge')).not.toBeInTheDocument();
    });

    it('does not arm the leave-confirm from the autonomy dial', async () => {
      const { history, services } = renderWatchDetail({ canManageAutonomy: true });

      const slider = await screen.findByRole('slider');
      await waitFor(() => expect(slider).toBeEnabled());
      fireEvent.change(slider, { target: { value: '1' } });
      fireEvent.click(await screen.findByTestId('pndAutonomyApply'));
      await waitFor(() => expect(services.http.put).toHaveBeenCalled());
      act(() => history.push('/watches'));

      expect(services.overlays.openConfirm).not.toHaveBeenCalled();
    });

    /** Stopping a watch is how a responder pulls the handbrake; it must not wait for a Save. */
    it('writes the Enabled switch through immediately', () => {
      const { updateWatch } = renderWatchDetail();

      fireEvent.click(screen.getByTestId('pndWatchEnabledSwitch'));

      expect(updateWatch).toHaveBeenCalledWith({ enabled: !deepWatch.enabled });
    });

    it('does not arm the leave-confirm from the Enabled switch', () => {
      const { history, services } = renderWatchDetail();

      fireEvent.click(screen.getByTestId('pndWatchEnabledSwitch'));
      act(() => history.push('/watches'));

      expect(services.overlays.openConfirm).not.toHaveBeenCalled();
    });
  });

  /**
   * The 2026-08-10 declutter, applied by bead kibana-phf4.33. Its predecessors — the disabled
   * `alwaysGate` requirement cell (kibana-phf4.14) and the inert Worker switch (kibana-phf4.6) — were
   * the better answer while the surfaces existed; the design's answer is that the surfaces do not.
   */
  describe('the 2026-08-10 declutter', () => {
    it('renders no KPI strip', () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndWatchMetricsStrip')).not.toBeInTheDocument();
    });

    it('renders no Approval gates section', () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndWatchApprovalGatesSection')).not.toBeInTheDocument();
    });

    it('renders no Approval gates table inside it either', () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndApprovalGatesTable')).not.toBeInTheDocument();
    });

    /**
     * A watch whose settings still carried gate rows must not resurrect the section: the field is
     * `#284009`'s schema and still readable, so "nothing seeds it" is not on its own a guarantee.
     */
    it('renders no Approval gates section even for settings that still carry gate rows', () => {
      renderWatchDetail({
        settingsOverrides: {
          approvalGates: [
            {
              approverRoleId: 'threat-hunter',
              approverRoleOptionIds: ['threat-hunter', 'soc-lead'],
              id: 'host-isolation',
              requirement: 'always',
              requirementLocked: true,
            },
          ],
        },
      });

      expect(screen.queryByTestId('pndWatchApprovalGatesSection')).not.toBeInTheDocument();
    });

    it('still renders the Skills section, which the design kept', () => {
      renderWatchDetail();

      expect(screen.getByTestId('pndWatchSkillsSection')).toBeInTheDocument();
    });

    it('offers no per-row enable toggle on a skill', () => {
      renderWatchDetail();

      expect(
        screen.queryByTestId('pndWatchSkillToggle-mitre-attack-mapping')
      ).not.toBeInTheDocument();
    });

    it('offers no per-row enable toggle on a projected worker', () => {
      renderWatchDetail({ workers: [deepWorker] });

      expect(screen.queryByTestId(`pndWorkerAlwaysRuns-${deepWorker.id}`)).not.toBeInTheDocument();
    });

    it('drops the skill-dependencies callout', () => {
      renderWatchDetail();

      expect(
        screen.queryByText(RETIRED_COPY.skillDependenciesCalloutTitle)
      ).not.toBeInTheDocument();
    });

    it('drops the audit-trail callout', () => {
      renderWatchDetail();

      expect(screen.queryByText(RETIRED_COPY.auditTrailCalloutTitle)).not.toBeInTheDocument();
    });
  });

  /**
   * The 2026-08-17 Watch-settings post-meeting simplification (prototype design log, `Aug 17`).
   *
   * Each `it` names the decision it pins. Absence is asserted with the literal copy in `RETIRED_COPY`
   * rather than an imported constant, because every constant behind these strings is deleted — a test
   * that asserted the absence of a string it also owned would pass no matter what the page rendered.
   */
  describe('the 2026-08-17 simplification', () => {
    it('drops the org-guardrails line from the autonomy dial', () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndViewGuardrailsLink')).not.toBeInTheDocument();
      expect(screen.queryByText(RETIRED_COPY.viewGuardrails)).not.toBeInTheDocument();
    });

    // Awaited: the dial renders once `GET /internal/pnd/autonomy` resolves, unlike every other section
    // on this page, which reads the already-mocked watch payload synchronously.
    it('keeps the autonomy slider the same decision kept', async () => {
      renderWatchDetail();

      expect(await screen.findByTestId('pndAutonomySlider')).toBeInTheDocument();
    });

    it('renders no General section, because it collapsed into the header', () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndWatchGeneralSection')).not.toBeInTheDocument();
      expect(screen.queryByText(RETIRED_COPY.generalSectionTitle)).not.toBeInTheDocument();
    });

    it('shows the run-as identity as a bare account line instead', () => {
      renderWatchDetail();

      expect(screen.getByTestId('pndWatchRunAsIdentity')).toHaveTextContent('svc-watch-deep');
    });

    it('gives that line no field label, which is what collapsing it removed', () => {
      renderWatchDetail();

      expect(screen.queryByText(RETIRED_COPY.runAsIdentityLabel)).not.toBeInTheDocument();
    });

    it('drops the MVP-scope callout even when the payload asks for it', () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndWatchMvpScopeCallout')).not.toBeInTheDocument();
      expect(screen.queryByText(RETIRED_COPY.mvpScopeCalloutTitle)).not.toBeInTheDocument();
    });

    it('labels the trigger dropdown Frequency, not Schedule', () => {
      renderWatchDetail();

      expect(screen.getByText(settingsI18n.SCHEDULE_LABEL)).toBeInTheDocument();
      expect(settingsI18n.SCHEDULE_LABEL).toBe('Frequency');
      expect(screen.queryByText(RETIRED_COPY.scheduleLabel)).not.toBeInTheDocument();
    });

    it("explains that a run's output triggers the watch's Workers", () => {
      renderWatchDetail();

      expect(screen.getByText(settingsI18n.SCHEDULE_HELP)).toBeInTheDocument();
      expect(settingsI18n.SCHEDULE_HELP).toBe(
        "How often this Watch runs. Persisted output triggers this Watch's Workers."
      );
    });

    it('drops the shared-with-Attack-Discovery callout even when the payload sets the flag', () => {
      renderWatchDetail({
        settingsOverrides: {
          triggers: { ...triggersSeed, sharedWithAttackDiscovery: true },
        },
      });

      expect(screen.queryByTestId('pndWatchAdSharedCallout')).not.toBeInTheDocument();
      expect(screen.queryByText(RETIRED_COPY.adSharedCalloutTitle)).not.toBeInTheDocument();
    });

    it('renders no Scope & routing section, which the decision deferred post-MVP', () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndWatchScopeRoutingSection')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pndWatchDataSourcesSelect')).not.toBeInTheDocument();
      expect(screen.queryByText(RETIRED_COPY.scopeSectionTitle)).not.toBeInTheDocument();
    });

    it('opens the Workers catalog from the section header', () => {
      const { history } = renderWatchDetail({ workers: [deepWorker] });

      fireEvent.click(screen.getByTestId('pndWatchViewAllWorkers'));

      expect(history.location.pathname).toBe('/watches/workers');
    });

    it('opens the Skills catalog from the section header', () => {
      const { history } = renderWatchDetail();

      fireEvent.click(screen.getByTestId('pndWatchViewAllSkills'));

      expect(history.location.pathname).toBe('/watches/skills');
    });

    /**
     * A frequency on a signal-driven watch would be a lie: it polls nothing. Which watch that is comes
     * from `PND_SIGNAL_DRIVEN_WATCH_TRIGGERS`, whose agreement with the YAML is asserted in
     * `kbn-pnd-common/managed_workflow_drift.test.ts` — the pairing is checked there so it cannot drift,
     * and checked here only for what it renders.
     */
    describe('a signal-driven watch', () => {
      it('is the post-incident watch, driven by the detection change signal', () => {
        expect(PND_SIGNAL_DRIVEN_WATCH_TRIGGERS).toEqual({
          [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
        });
      });

      it('explains the signal instead of offering a frequency', () => {
        renderWatchDetail({ watch: postIncidentWatch });

        expect(screen.getByTestId('pndWatchSignalDrivenCallout')).toBeInTheDocument();
      });

      it('offers no frequency dropdown at all', () => {
        renderWatchDetail({ watch: postIncidentWatch });

        expect(screen.queryByTestId('pndWatchScheduleSelect')).not.toBeInTheDocument();
      });

      it('can still be started by hand', () => {
        renderWatchDetail({ watch: postIncidentWatch });

        expect(screen.getByTestId('pndWatchManualRunSwitch')).toBeInTheDocument();
      });

      it('does not explain a signal on a scheduled watch', () => {
        renderWatchDetail();

        expect(screen.queryByTestId('pndWatchSignalDrivenCallout')).not.toBeInTheDocument();
        expect(screen.getByTestId('pndWatchScheduleSelect')).toBeInTheDocument();
      });
    });
  });

  /**
   * The 2026-08-13 header and table declutter (prototype design log, `Aug 13`).
   *
   * `.21` shipped the Save half of that entry; these are the three items it left.
   */
  describe('the 2026-08-13 declutter', () => {
    it('drops the Enabled badge, because the switch is the single source of truth', () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndWatchEnabledBadge')).not.toBeInTheDocument();
    });

    it('still offers the Enabled switch that replaced it', () => {
      renderWatchDetail();

      expect(screen.getByTestId('pndWatchEnabledSwitch')).toBeInTheDocument();
    });

    it('badges neither Enabled nor Disabled, whichever the watch is', () => {
      renderWatchDetail({ watch: { ...deepWatch, enabled: false } });

      expect(screen.queryByText(RETIRED_COPY.disabledBadge)).not.toBeInTheDocument();
      expect(screen.queryByText(RETIRED_COPY.enabledBadge)).not.toBeInTheDocument();
    });

    it("drops the role badge beside the watch's title", () => {
      renderWatchDetail();

      expect(screen.queryByTestId('pndWatchMandateBadge')).not.toBeInTheDocument();
      expect(screen.queryByText(deepWatch.mandate)).not.toBeInTheDocument();
    });

    /**
     * `thead` rather than a rendered-header query: the section title already names the list, so the
     * header row is chrome. `tableCaption` carries the accessible name in its place, which is why the
     * caption assertions below matter.
     */
    it('gives the Workers table no column header row', () => {
      const { container } = renderWatchDetail({ workers: [deepWorker] });

      const workersTable = container.querySelector('[data-test-subj="pndWatchWorkersTable"] table');
      expect(getComputedStyle(workersTable?.querySelector('thead') as Element).display).toBe(
        'none'
      );
    });

    it('gives the Skills table no column header row', () => {
      const { container } = renderWatchDetail();

      const skillsTable = container.querySelector('[data-test-subj="pndWatchSkillsTable"] table');
      expect(getComputedStyle(skillsTable?.querySelector('thead') as Element).display).toBe('none');
    });

    /**
     * What makes hiding those headers safe rather than just tidy: with the `thead` out of the
     * accessibility tree, the caption is the table's only accessible name.
     *
     * Awaited because `EuiBasicTable` puts `tableCaption` behind an `EuiDelayRender` — the `<caption>`
     * element is present but **empty** on first paint, so a synchronous assertion here proves nothing.
     * Scoped to the caption node rather than `getByText`, because each table's caption text is also its
     * section subtitle and would otherwise match twice.
     */
    it('names both header-less tables for a screen reader instead', async () => {
      const { container } = renderWatchDetail({ workers: [deepWorker] });

      await waitFor(() => {
        expect(
          container.querySelector('[data-test-subj="pndWatchWorkersTable"] table caption')
        ).toHaveTextContent(settingsI18n.WORKERS_SECTION_SUBTITLE);
        expect(
          container.querySelector('[data-test-subj="pndWatchSkillsTable"] table caption')
        ).toHaveTextContent(settingsI18n.SKILLS_SECTION_SUBTITLE);
      });
    });
  });
});
