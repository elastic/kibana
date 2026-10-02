/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { SEVERITY_OPTIONS, getSeverityLabel } from '@kbn/significant-events-schema';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiSelect,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { journey } from './journey_translations';

export const InvestigationControls = (): React.ReactElement => {
  const { core, dependencies } = useKibana();
  const client = dependencies.start.nightshiftInvestigations?.investigationsClient;
  const cache = useQueryClient();
  const params = new URLSearchParams(useLocation().search);
  const id = useGeneratedHtmlId({ prefix: 'investigationControls' });
  const canManage = getNightshiftCapabilities(core.application.capabilities.nightshift).canManage;
  const [creating, setCreating] = useState(params.has('automationRule'));
  const [name, setName] = useState(params.get('automationName') || journey.automationDefaultName);
  const [pattern, setPattern] = useState(params.get('automationRule') || '');
  const [severity, setSeverity] = useState('80-critical');
  const [prompt, setPrompt] = useState(journey.automationDefaultPrompt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['detectionAutomations'],
    enabled: Boolean(client),
    queryFn: async ({ signal }) => {
      if (!client) throw new Error(journey.automationDisabled);
      return client.fetch('GET /internal/nightshift/automations', {
        signal: signal ?? null,
        params: {},
      });
    },
    refetchInterval: 30000,
  });
  const perform = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      await action();
      await cache.invalidateQueries({ queryKey: ['detectionAutomations'] });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };
  if (!client)
    return <EuiCallOut announceOnMount title={journey.automationDisabled} color="warning" />;
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{journey.automation}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>{journey.automationHint}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="significantEventsAppInvestigationControlsButton"
            size="s"
            iconType="plusCircle"
            isDisabled={!canManage}
            onClick={() => setCreating(true)}
          >
            {journey.createAutomation}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {query.isLoading && <EuiLoadingSpinner />}
      {(error || query.isError) && (
        <>
          <EuiCallOut announceOnMount title={error || journey.error} color="danger" />
          <EuiSpacer size="m" />
        </>
      )}
      {query.data?.automations.length === 0 && (
        <EuiText size="s" color="subdued">
          <p>{journey.automationNoItems}</p>
        </EuiText>
      )}
      {query.data?.automations.map((automation) => (
        <React.Fragment key={automation.id}>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{automation.name}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  <p>{automation.description}</p>
                  <p>
                    {automation.trigger.rows
                      .map((row) =>
                        row.kind === 'significant_event'
                          ? [
                              row.titlePattern || '*',
                              ...(row.severities || []).map(getSeverityLabel),
                            ].join(' · ')
                          : row.kind === 'alert'
                          ? row.ruleNamePattern || '*'
                          : row.kind
                      )
                      .join(' · ')}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {automation.completion.action === 'post_to_slack'
                    ? journey.notification
                    : journey.investigations}
                </EuiBadge>
              </EuiFlexItem>
              {automation.workflowId && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="significantEventsAppInvestigationControlsButton"
                    size="xs"
                    iconType="workflow"
                    href={core.application.getUrlForApp('workflows', {
                      path: `/${encodeURIComponent(automation.workflowId)}`,
                    })}
                  >
                    {journey.openWorkflow}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  compressed
                  label={journey.automationEnabled}
                  checked={automation.isEnabled}
                  disabled={!canManage || busy}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    void perform(async () => {
                      await client.fetch('PUT /internal/nightshift/automations/{id}', {
                        signal: null,
                        params: { path: { id: automation.id }, body: { isEnabled: enabled } },
                      });
                    });
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
      {creating && (
        <EuiModal onClose={() => setCreating(false)} aria-labelledby={`${id}-create`}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={`${id}-create`}>
              {journey.createAutomation}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s" color="subdued">
              <p>{journey.automationScopeHint}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFormRow label={journey.automationName}>
              <EuiFieldText
                data-test-subj="significantEventsAppInvestigationControlsFieldText"
                maxLength={500}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow label={journey.rulePattern}>
              <EuiFieldText
                data-test-subj="significantEventsAppInvestigationControlsFieldText"
                maxLength={1000}
                value={pattern}
                onChange={(event) => setPattern(event.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('xpack.significantEventsApp.automation.severity', {
                defaultMessage: 'Event severity',
              })}
            >
              <EuiSelect
                data-test-subj="significantEventsAppInvestigationControlsSelect"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                options={[
                  {
                    value: 'all',
                    text: i18n.translate('xpack.significantEventsApp.automation.allSeverities', {
                      defaultMessage: 'All severities',
                    }),
                  },
                  ...SEVERITY_OPTIONS.map((value) => ({ value, text: getSeverityLabel(value) })),
                ]}
              />
            </EuiFormRow>
            <EuiFormRow label={journey.automationPrompt}>
              <EuiTextArea
                data-test-subj="significantEventsAppInvestigationControlsTextArea"
                rows={6}
                maxLength={50000}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </EuiFormRow>
            {error && <EuiCallOut announceOnMount title={error} color="danger" />}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppInvestigationControlsButton"
              onClick={() => setCreating(false)}
            >
              {journey.cancel}
            </EuiButtonEmpty>
            <EuiButton
              data-test-subj="significantEventsAppInvestigationControlsButton"
              fill
              isLoading={busy}
              isDisabled={!name.trim() || !canManage}
              onClick={() =>
                perform(async () => {
                  await client.fetch('POST /internal/nightshift/automations', {
                    signal: null,
                    params: {
                      body: {
                        name: name.trim(),
                        automationType: 'custom',
                        trigger: {
                          rows: [
                            {
                              kind: 'significant_event',
                              titlePattern: pattern.trim() || undefined,
                              severities: SEVERITY_OPTIONS.filter(
                                (value) => severity === 'all' || value === severity
                              ),
                            },
                          ],
                        },
                        execution: { promptTemplate: prompt, reasoningMode: 'investigate' },
                        completion: { action: 'create_investigation' },
                        runtime: {
                          dailyDispatchLimit: 10,
                          timeoutSeconds: 900,
                          dedupeWindowSeconds: 3600,
                          overlapPolicy: 'drop',
                        },
                      },
                    },
                  });
                  setCreating(false);
                  core.notifications.toasts.addSuccess(journey.automationCreated);
                })
              }
            >
              {journey.createAutomation}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </EuiPanel>
  );
};
