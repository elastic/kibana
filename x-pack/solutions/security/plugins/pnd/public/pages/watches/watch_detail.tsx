/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
import { isHttpFetchError } from '@kbn/core-http-browser';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { ApprovalRequirement } from '@kbn/pnd-common';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useUpdateWatch, useWatch } from '../../hooks/use_watches_api';
import { ApprovalGatesTable } from './components/approval_gates_table';
import { AutonomySlider } from './components/autonomy_slider';
import { SettingsSection } from './components/settings_section';
import { WatchRunsLedger } from './components/watch_runs_ledger';
import { WatchScopeRoutingSection } from './components/watch_scope_routing_section';
import { WatchSkillsTable } from './components/watch_skills_table';
import { WatchTriggersSection } from './components/watch_triggers_section';
import { WatchWorkersTable } from './components/watch_workers_table';
import { WatchesSectionLayout } from './components/watches_section_layout';
import * as i18n from './translations';
import * as settingsI18n from './settings_translations';

export const WatchDetailPage: React.FC = () => {
  const history = useHistory();
  const { watchId } = useParams<{ watchId: string }>();
  const { data, isLoading, error, refetch } = useWatch(watchId);
  const { mutate: updateWatch } = useUpdateWatch(watchId);

  const watch = data?.watch;
  const settings = data?.settings;
  usePndDocTitle(watch?.name ?? i18n.PAGE_TITLE);

  const onToggleWorker = useCallback(
    (workerId: string, enabled: boolean) => updateWatch({ worker: { workerId, enabled } }),
    [updateWatch]
  );

  const onGateRequirementChange = useCallback(
    (gateId: string, requirement: ApprovalRequirement) =>
      updateWatch({ approvalGate: { gateId, requirement } }),
    [updateWatch]
  );

  const onGateApproverChange = useCallback(
    (gateId: string, approverRoleId: string) =>
      updateWatch({ approvalGate: { gateId, approverRoleId } }),
    [updateWatch]
  );

  const headerSwitch = useMemo<AppHeaderMenu['switch']>(() => {
    if (!watch) {
      return undefined;
    }
    return {
      id: 'pndWatchEnabled',
      label: settingsI18n.ENABLED_SWITCH_LABEL,
      labelProps: undefined,
      checked: watch.enabled,
      onChange: (checked: boolean) => updateWatch({ enabled: checked }),
      'data-test-subj': 'pndWatchEnabledSwitch',
    };
  }, [watch, updateWatch]);

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

  if (settings) {
    sections.push({
      key: 'autonomy',
      node: (
        <SettingsSection
          title={settingsI18n.AUTONOMY_SECTION_TITLE}
          subtitle={settingsI18n.AUTONOMY_SECTION_SUBTITLE}
          data-test-subj="pndWatchAutonomySection"
        >
          <AutonomySlider
            current={settings.autonomy}
            onChange={(autonomyLevel) => updateWatch({ autonomyLevel })}
          />
        </SettingsSection>
      ),
    });

    if (settings.triggers) {
      sections.push({
        key: 'triggers',
        node: (
          <WatchTriggersSection
            triggers={settings.triggers}
            onScheduleChange={(scheduleId) => updateWatch({ triggers: { scheduleId } })}
            onManualRunChange={(allowManualRun) => updateWatch({ triggers: { allowManualRun } })}
          />
        ),
      });
    }

    if (settings.scopeRouting) {
      sections.push({
        key: 'scopeRouting',
        node: (
          <WatchScopeRoutingSection
            scopeRouting={settings.scopeRouting}
            scopes={watch.scopes}
            onSelectChange={(key, selectedId) =>
              updateWatch({ scopeRouting: { [key]: selectedId } })
            }
          />
        ),
      });
    }

    if (settings.workers && settings.workers.length > 0) {
      sections.push({
        key: 'workers',
        node: (
          <SettingsSection
            title={settingsI18n.WORKERS_SECTION_TITLE}
            subtitle={settingsI18n.WORKERS_SECTION_SUBTITLE}
            data-test-subj="pndWatchWorkersSection"
          >
            <WatchWorkersTable attachments={settings.workers} onToggle={onToggleWorker} />
          </SettingsSection>
        ),
      });
    }

    if (watch.skills && watch.skills.length > 0) {
      sections.push({
        key: 'skills',
        node: (
          <SettingsSection
            title={settingsI18n.SKILLS_SECTION_TITLE}
            subtitle={settingsI18n.SKILLS_SECTION_SUBTITLE}
            rightAction={
              <EuiButtonEmpty
                size="xs"
                flush="right"
                onClick={() => history.push('/watches/skills')}
              >
                {settingsI18n.SKILLS_VIEW_ALL}
              </EuiButtonEmpty>
            }
            data-test-subj="pndWatchSkillsSection"
          >
            <WatchSkillsTable attachments={watch.skills} />
          </SettingsSection>
        ),
      });
    }

    if (settings.approvalGates && settings.approvalGates.length > 0) {
      sections.push({
        key: 'approvalGates',
        node: (
          <SettingsSection
            title={settingsI18n.GATES_SECTION_TITLE}
            subtitle={settingsI18n.GATES_SECTION_SUBTITLE}
            data-test-subj="pndWatchApprovalGatesSection"
          >
            <ApprovalGatesTable
              gates={settings.approvalGates}
              onRequirementChange={onGateRequirementChange}
              onApproverChange={onGateApproverChange}
            />
            <EuiSpacer size="m" />
            <KbnInfoCallout
              announceOnMount
              title={settingsI18n.AUDIT_TRAIL_CALLOUT_TITLE}
              text={<p>{settingsI18n.AUDIT_TRAIL_CALLOUT_BODY}</p>}
              size="s"
            />
          </SettingsSection>
        ),
      });
    }

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
          </SettingsSection>
        ),
      });
    }
  }

  return (
    <WatchesSectionLayout active={watchId} title={watch.name} headerSwitch={headerSwitch}>
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
    </WatchesSectionLayout>
  );
};
