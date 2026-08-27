/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import type { ScopedHistory } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQueryClient } from '@kbn/react-query';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import type { AppHeaderBadge, AppHeaderMenu } from '@kbn/app-header';
import { API_VERSIONS, PND_SIGNAL_DRIVEN_WATCH_TRIGGERS, buildWatchUrl } from '@kbn/pnd-common';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import {
  notifyWatchUpdateError,
  useUpdateWatch,
  useWatch,
  useWatches,
} from '../../hooks/use_watches_api';
import { useWorkers } from '../../hooks/use_workers_api';
import { queryKeys } from '../../query_keys';
import { getErrorMessage } from '../../states';
import { buildRunsWatchIdSearch } from './activity/helpers/read_runs_watch_id';
import { remainingDisabledCatalogWatchIds } from './helpers/remaining_disabled_catalog_watch_ids';
import { useWatchSettingsDraft } from './hooks/use_watch_settings_draft';
import { AutonomyControl } from './components/autonomy_control';
import { EnableRemainingWatchesModal } from './components/enable_remaining_watches_modal';
import { SettingsSection } from './components/settings_section';
import { WatchRunsLedger } from './components/watch_runs_ledger';
import { WatchSkillsTable } from './components/watch_skills_table';
import { WatchTriggersSection } from './components/watch_triggers_section';
import { WatchesSectionLayout } from './components/watches_section_layout';
import { WorkerCatalogTable } from './components/worker_catalog_table';
import * as i18n from './translations';
import * as settingsI18n from './settings_translations';
import * as workersI18n from './workers/translations';

export const WatchDetailPage: React.FC = () => {
  const history = useHistory();
  const { watchId } = useParams<{ watchId: string }>();
  const { data, isLoading, error, refetch } = useWatch(watchId);
  const { data: watchesData } = useWatches();
  const { data: workersData } = useWorkers();
  const { mutate: updateWatch, isLoading: isSaving } = useUpdateWatch(watchId);
  const queryClient = useQueryClient();
  const [isEnablingRemaining, setIsEnablingRemaining] = useState(false);
  const [remainingWatchIds, setRemainingWatchIds] = useState<readonly string[] | null>(null);
  /**
   * `history` here is the `ScopedHistory` the app mounted its `Router` with, which the leave-confirm
   * below needs. It is the same object react-router's `useHistory()` returns, but that hook types it
   * as a plain `History`, which the prompt's SPA-blocking props do not accept.
   */
  const { services } = useKibana<{ history?: ScopedHistory }>();
  const { application, http, overlays } = services;
  const toasts = services.notifications?.toasts;

  const watch = data?.watch;
  const settings = data?.settings;
  usePndDocTitle(watch?.name ?? i18n.PAGE_TITLE);

  /**
   * Every settings control below edits this draft; nothing but Save writes.
   *
   * ⛔ The autonomy dial and the header's Enabled switch are deliberately NOT part of it — see the
   * comments on each. Do not "unify" them into the draft: the PATCH route rejects `autonomyLevel`
   * outright (kibana-phf4.13), and it rejects it all-or-nothing, so a single autonomy key in the body
   * would make a whole page of settings edits land nothing.
   *
   * `setScopeRoutingSelection` is deliberately **not** destructured: the 2026-08-17 simplification
   * deferred the Scope & routing section post-MVP, so nothing on this page produces that edit today. The
   * hook still returns the setter and the draft still carries the section — see the block comment where
   * the section used to render. Pulling it out here without a control would only be an unused binding.
   */
  const { discard, draft, isDirty, markSaved, patch, setAllowManualRun, setScheduleId } =
    useWatchSettingsDraft(settings);

  /**
   * The Workers this watch's lane runs, projected from its real `ai.agent` steps (kibana-phf4.6).
   *
   * A watch carries no worker attachments any more, so the rows come from the shared catalog filtered
   * by `watchIds` rather than from `settings`. Three of the five watches run no agent PND installs, so
   * for those this is empty and the section below does not render at all — which is the truthful
   * answer, where the retired seed listed workers for every watch.
   */
  /**
   * The signal that drives this watch, when one does.
   *
   * A lookup rather than a field on the payload: which watch is signal-driven is a property of the
   * managed YAML, not of the mock settings store, and `managed_workflow_drift.test.ts` asserts this map
   * against the triggers those definitions really declare — in both directions, so a watch cannot be
   * described as signal-driven while a frequency governs it, or offered a Frequency select that governs
   * nothing.
   */
  const signalTriggerId: string | undefined =
    PND_SIGNAL_DRIVEN_WATCH_TRIGGERS[watchId as keyof typeof PND_SIGNAL_DRIVEN_WATCH_TRIGGERS];

  const watchWorkers = useMemo(
    () => (workersData?.workers ?? []).filter(({ watchIds }) => watchIds.includes(watchId)),
    [watchId, workersData?.workers]
  );

  /**
   * The one write the settings sections make: every pending edit as a single PATCH.
   *
   * The route validates the whole body before mutating anything, so a rejected save changes nothing
   * server-side. Keeping the draft as-is on failure therefore matches what the store did — the page
   * stays dirty, the toast says why, and the customer can fix the offending row and save again. The
   * baseline only moves once a save has actually landed.
   */
  const onSave = useCallback(
    () =>
      updateWatch(patch, {
        onError: (saveError) =>
          toasts?.addDanger({
            text: getErrorMessage(saveError, settingsI18n.SAVE_FAILED_FALLBACK),
            title: settingsI18n.SAVE_FAILED,
          }),
        onSuccess: () => markSaved(),
      }),
    [markSaved, patch, toasts, updateWatch]
  );

  /**
   * "View all runs" opens the run and trust ledger already scoped to this watch. `settings.runsLedger`
   * above is the store's own last-few list; the ledger page is the live `GET /internal/pnd/runs` read.
   */
  /**
   * The Workers and Skills sections list what *this* watch attaches; their "View all …" links open the
   * catalogs, which are already pages in this section's subnav (2026-08-17 simplification). Navigation
   * through `history` rather than an `href`, so the subnav's collapse state and the SPA route survive.
   */
  const onViewAllWorkers = useCallback(() => history.push('/watches/workers'), [history]);
  const onViewAllSkills = useCallback(() => history.push('/watches/skills'), [history]);

  const onViewAllRuns = useCallback(
    () =>
      history.push({
        pathname: '/watches/activity',
        search: buildRunsWatchIdSearch('', watchId),
      }),
    [history, watchId]
  );

  /**
   * "Unsaved changes" is the only badge this header carries.
   *
   * ⛔ Two others were here and the 2026-08-13 declutter removed both. The **Enabled** badge went
   * because the Enabled switch beside it is the single source of truth for on/off, and a badge that
   * restates a control one inch away can only ever agree with it or be a bug. The **mandate** badge
   * ("Frontline triage") is the role badge that decision names by example: the watch's own description
   * below already says what it is. `Watch.mandate` still renders on the library's cards, which is where
   * the schema says it belongs and where a reader is comparing watches rather than reading one.
   */
  const badges = useMemo<AppHeaderBadge[]>(() => {
    if (!watch || !isDirty) {
      return [];
    }
    // Only ever present while the draft differs from the fetched settings, so the badge and Save
    // cannot disagree: both read the same diff.
    return [
      {
        label: settingsI18n.UNSAVED_CHANGES_BADGE,
        color: 'primary' as const,
        tooltip: settingsI18n.UNSAVED_CHANGES_BADGE_TOOLTIP,
        'data-test-subj': 'pndWatchUnsavedChangesBadge',
      },
    ];
  }, [isDirty, watch]);

  const onEnabledChange = useCallback(
    (checked: boolean) => {
      updateWatch(
        { enabled: checked },
        {
          onSuccess: () => {
            if (!checked || watch == null) {
              return;
            }
            const remaining = remainingDisabledCatalogWatchIds({
              justEnabledId: watch.id,
              watches: watchesData?.watches ?? [],
            });
            if (remaining.length > 0) {
              setRemainingWatchIds(remaining);
            }
          },
        }
      );
    },
    [updateWatch, watch, watchesData?.watches]
  );

  const onCancelEnableRemaining = useCallback(() => {
    setRemainingWatchIds(null);
  }, []);

  const onConfirmEnableRemaining = useCallback(async () => {
    if (http == null || remainingWatchIds == null || remainingWatchIds.length === 0) {
      return;
    }
    setIsEnablingRemaining(true);
    try {
      await Promise.all(
        remainingWatchIds.map((id) =>
          http.patch(buildWatchUrl(id), {
            body: JSON.stringify({ enabled: true }),
            version: API_VERSIONS.internal.v1,
          })
        )
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.watches.list() });
      setRemainingWatchIds(null);
    } catch (enableError) {
      if (toasts != null) {
        notifyWatchUpdateError(toasts, enableError);
      }
    } finally {
      setIsEnablingRemaining(false);
    }
  }, [http, queryClient, remainingWatchIds, toasts]);

  /**
   * The Enabled switch writes through immediately, unlike everything in the draft.
   *
   * It is a header control rather than a settings field: it is how a responder stops a watch, and
   * making that wait for a Save at the bottom of a long page would be the wrong trade in an incident.
   * It therefore also does not arm the leave-confirm: it has no pending state of its own to lose.
   */
  const headerSwitch = useMemo<AppHeaderMenu['switch']>(() => {
    if (!watch) {
      return undefined;
    }
    return {
      id: 'pndWatchEnabled',
      label: settingsI18n.ENABLED_SWITCH_LABEL,
      labelProps: undefined,
      checked: watch.enabled,
      onChange: onEnabledChange,
      'data-test-subj': 'pndWatchEnabledSwitch',
    };
  }, [onEnabledChange, watch]);

  /** Save and Discard appear only on a watch that has settings to save. */
  const primaryAction = useMemo<AppHeaderMenu['primaryActionItem']>(() => {
    if (!settings) {
      return undefined;
    }
    return {
      disableButton: !isDirty,
      iconType: 'save',
      id: 'pndWatchSettingsSave',
      isLoading: isSaving,
      label: settingsI18n.SAVE,
      run: onSave,
      testId: 'pndWatchSettingsSave',
      tooltipContent: isDirty ? undefined : settingsI18n.SAVE_NO_CHANGES_TOOLTIP,
    };
  }, [isDirty, isSaving, onSave, settings]);

  const headerMenuItems = useMemo<AppHeaderMenu['items']>(() => {
    if (!settings) {
      return undefined;
    }
    return [
      {
        disableButton: !isDirty,
        iconType: 'trash',
        id: 'pndWatchSettingsDiscard',
        label: settingsI18n.DISCARD_CHANGES,
        overflow: true,
        run: discard,
        testId: 'pndWatchSettingsDiscard',
      },
    ];
  }, [discard, isDirty, settings]);

  /**
   * Blocks navigation away from unsaved edits, using the shared prompt the rest of Kibana uses
   * (precedent: the roles-management edit page). Confirming discards the draft by leaving; cancelling
   * stays on the page with the draft intact.
   *
   * Called unconditionally, above the early returns below, because it is a hook. When a consumer
   * supplies fewer services than the app does it degrades to the `beforeunload` guard alone rather
   * than asserting they are there.
   */
  useUnsavedChangesPrompt(
    application != null && http != null && overlays != null && services.history != null
      ? {
          cancelButtonText: settingsI18n.LEAVE_MODAL_CANCEL,
          confirmButtonText: settingsI18n.LEAVE_MODAL_CONFIRM,
          hasUnsavedChanges: isDirty,
          history: services.history,
          http,
          messageText: settingsI18n.LEAVE_MODAL_BODY,
          navigateToUrl: application.navigateToUrl,
          openConfirm: overlays.openConfirm,
          titleText: settingsI18n.LEAVE_MODAL_TITLE,
        }
      : { blockSpaNavigation: false, hasUnsavedChanges: isDirty }
  );

  const hasCurrentWatch = watch?.id === watchId;
  const isNotFound =
    (isHttpFetchError(error) && error.response?.status === 404) ||
    (!isLoading && !error && !hasCurrentWatch);

  if (!hasCurrentWatch && isLoading) {
    return (
      <WatchesSectionLayout active={watchId} title={i18n.PAGE_TITLE}>
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING_WATCH} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </WatchesSectionLayout>
    );
  }

  if (!watch || !hasCurrentWatch) {
    return (
      <WatchesSectionLayout active={watchId} title={i18n.PAGE_TITLE}>
        <EuiEmptyPrompt
          iconType={isNotFound ? 'search' : 'error'}
          title={<h2>{isNotFound ? i18n.WATCH_NOT_FOUND_TITLE : i18n.WATCH_LOAD_ERROR_TITLE}</h2>}
          body={<p>{isNotFound ? i18n.WATCH_NOT_FOUND_BODY : i18n.WATCH_LOAD_ERROR_BODY}</p>}
          actions={
            <EuiFlexGroup gutterSize="s" justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => history.push('/watches')}>
                  {i18n.BACK_TO_WATCHES}
                </EuiButton>
              </EuiFlexItem>
              {error && !isNotFound ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={() => refetch()}>{i18n.RETRY}</EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          }
        />
      </WatchesSectionLayout>
    );
  }

  const intro = settingsI18n.watchIntro(watch.id);

  // Sections render only when the watch exposes them, so each watch shows a different set. Built as
  // a list so the column flex group below owns the spacing between them.
  const sections: Array<{ key: string; node: React.ReactNode }> = [];

  /**
   * Autonomy is the one section that is NOT conditional on `settings`.
   *
   * Every other section reads the in-memory watch store, which only answers in mock mode. The
   * autonomy dial reads `GET /internal/pnd/autonomy` — the space-scoped uiSetting the HITL gates
   * actually resolve auto-accept against — so it is the one control on this page that persists, and
   * it works in both modes. `AutonomyControl` owns the write, the `pnd_manage_autonomy` privilege
   * check and the post-raise sweep prompt; the slider inside it is `AutonomySlider`, so the dial
   * still renders the one shared scale.
   *
   * That write is also the *only* one: this page deliberately does not mirror the persisted level
   * back through `PATCH /internal/pnd/watches/{watchId}`, which now rejects `autonomyLevel` outright
   * (the PATCH route carries `pnd_write`, not `pnd_manage_autonomy`). `settings.autonomy` is a
   * read-only projection field — do not bind a control to it.
   */
  sections.push({
    key: 'autonomy',
    node: (
      <SettingsSection
        title={settingsI18n.AUTONOMY_SECTION_TITLE}
        subtitle={settingsI18n.AUTONOMY_SECTION_SUBTITLE}
        data-test-subj="pndWatchAutonomySection"
      >
        <AutonomyControl watch={watch} />
      </SettingsSection>
    ),
  });

  if (settings) {
    // From here on the sections render `draft`, not `settings`: an edit has to show up in the control
    // immediately even though nothing has been written yet.
    if (draft.triggers) {
      sections.push({
        key: 'triggers',
        node: (
          <WatchTriggersSection
            triggers={draft.triggers}
            signalTriggerId={signalTriggerId}
            onScheduleChange={setScheduleId}
            onManualRunChange={setAllowManualRun}
          />
        ),
      });
    }

    /**
     * ⛔ There is deliberately no Scope & routing section rendered here.
     *
     * The 2026-08-17 simplification **deferred** it post-MVP — data sources, assignee queue and
     * escalation contact — and deferred is not rejected, which is why none of the code behind it was
     * deleted. `components/watch_scope_routing_section.tsx`, `withScopeRoutingSelection`,
     * `WATCH_SCOPE_ROUTING_KEYS`, the draft's `scopeRouting` section, the `setScopeRoutingSelection`
     * setter, the PATCH field and all four sets of tests are intact and still pass. Re-rendering this
     * section is one `sections.push` — do not "clean up" the machinery under it, and note that the
     * setter having no caller is the expected state until then, not an oversight.
     */

    /**
     * Workers are projected, not stored, so this section no longer reads `settings` — but it stays
     * inside this block on purpose. Every other section here is mock-mode-only, and hoisting just
     * this one out would render a lone Workers panel on a page whose other sections are all absent.
     * Whether the settings page has a live mode at all is a separate decision from this bead.
     */
    /*
      TODO: per-worker parameter controls (e.g. which AI model a step uses) belong here, per
      attachment, and the 2026-08-17 simplification deliberately **reserved** the pattern rather than
      showing it — an expandable row or a gear popover, scoped "applies to this Watch only". It waits on
      the list of parameters that are actually customizable. Reserved, not dropped: a control that
      offers a parameter the runtime ignores is worse than its absence.
    */
    if (watchWorkers.length > 0) {
      sections.push({
        key: 'workers',
        node: (
          <SettingsSection
            title={settingsI18n.WORKERS_SECTION_TITLE}
            subtitle={settingsI18n.WORKERS_SECTION_SUBTITLE}
            headerAction={
              <EuiButtonEmpty
                data-test-subj="pndWatchViewAllWorkers"
                flush="right"
                onClick={onViewAllWorkers}
                size="xs"
              >
                {settingsI18n.VIEW_ALL_WORKERS}
              </EuiButtonEmpty>
            }
            data-test-subj="pndWatchWorkersSection"
          >
            <WorkerCatalogTable
              caption={settingsI18n.WORKERS_SECTION_SUBTITLE}
              data-test-subj="pndWatchWorkersTable"
              hideColumnHeaders
              noItemsMessage={workersI18n.NO_WORKERS}
              showWatches={false}
              workers={watchWorkers}
            />
          </SettingsSection>
        ),
      });
    }

    /**
     * Read-only, and with no skill-dependencies callout above it (bead kibana-phf4.33).
     *
     * Reads `settings` rather than `draft`, unlike the two sections above: with the per-row enable
     * toggle gone there is nothing here for a Save to carry, so `skills` left the draft entirely.
     */
    if (settings.skills && settings.skills.length > 0) {
      sections.push({
        key: 'skills',
        node: (
          <SettingsSection
            title={settingsI18n.SKILLS_SECTION_TITLE}
            subtitle={settingsI18n.SKILLS_SECTION_SUBTITLE}
            headerAction={
              <EuiButtonEmpty
                data-test-subj="pndWatchViewAllSkills"
                flush="right"
                onClick={onViewAllSkills}
                size="xs"
              >
                {settingsI18n.VIEW_ALL_SKILLS}
              </EuiButtonEmpty>
            }
            data-test-subj="pndWatchSkillsSection"
          >
            <WatchSkillsTable attachments={settings.skills} />
          </SettingsSection>
        ),
      });
    }

    /**
     * ⛔ There is deliberately no Approval gates section here any more, and no audit-trail callout
     * with it (bead kibana-phf4.33). The 2026-08-10 design deleted the whole section, and this page
     * was the only surface that rendered `WatchSettings.approvalGates`.
     *
     * D15 — containment and apply-tuning always require a human, at every autonomy level — is
     * unaffected, because the table only ever *displayed* it. It is enforced in three places that
     * remain: the `alwaysGate` flag in `PND_GATE_REGISTRY`, the absence of an `if` wrapper around
     * `await_incident_contained` / `await_apply_tuning` in the watch YAML, and `_auto_respond`'s
     * unconditional refusal of both. Each is asserted by tests, and `PATCH`
     * /internal/pnd/watches/{watchId}` now rejects `approvalGates` outright rather than recording a
     * policy no surface shows. What is genuinely lost is the affordance: a customer can no longer
     * *see* that those two actions always gate. Register `#57` names that and raises it with design.
     */

    if (settings.runsLedger) {
      sections.push({
        key: 'runsLedger',
        node: (
          <SettingsSection
            title={settingsI18n.LEDGER_SECTION_TITLE}
            subtitle={settingsI18n.LEDGER_SECTION_SUBTITLE}
            data-test-subj="pndWatchRunsLedgerSection"
          >
            <WatchRunsLedger entries={settings.runsLedger} />
            <EuiSpacer size="m" />
            {/*
              The ledger section shows this watch's last few runs. "View all runs" opens the full
              run and trust ledger already filtered to this watch — the filter travels as a URL
              param rather than component state, so the link is shareable and the ledger applies it
              server-side.
            */}
            <EuiButtonEmpty
              data-test-subj="pndWatchDetailViewAllRuns"
              flush="left"
              onClick={onViewAllRuns}
              size="s"
            >
              {i18n.VIEW_ALL_RUNS}
            </EuiButtonEmpty>
          </SettingsSection>
        ),
      });
    }
  }

  return (
    <WatchesSectionLayout
      active={watchId}
      title={watch.name}
      badges={badges}
      headerMenuItems={headerMenuItems}
      headerSwitch={headerSwitch}
      primaryAction={primaryAction}
    >
      <EuiFlexGroup direction="column" gutterSize="xl" responsive={false}>
        {intro ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="pndWatchIntro">
              <p>{intro}</p>
            </EuiText>
          </EuiFlexItem>
        ) : null}

        {sections.map(({ key, node }) => (
          <EuiFlexItem key={key} grow={false}>
            {node}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {remainingWatchIds != null && remainingWatchIds.length > 0 ? (
        <EnableRemainingWatchesModal
          isEnabling={isEnablingRemaining}
          onCancel={onCancelEnableRemaining}
          onConfirm={onConfirmEnableRemaining}
          remainingWatchIds={remainingWatchIds}
        />
      ) : null}
    </WatchesSectionLayout>
  );
};
