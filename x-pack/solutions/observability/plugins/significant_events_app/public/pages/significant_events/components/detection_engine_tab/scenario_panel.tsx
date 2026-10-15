/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LabIncidentKind, LabState } from '@kbn/significant-events-plugin/common';
import React from 'react';
import type { IDetectionEngineActions } from '../../../../hooks/use_detection_engine_actions';
import { formatAgo } from './format';
import { DEMO_SCENARIOS, INCIDENT_LABELS } from './labels';
import { useNow } from './use_now';

const INCIDENT_KINDS: LabIncidentKind[] = ['error_spike', 'latency', 'silence', 'new_error'];
const CUSTOMER_RULE_SERVICE = 'checkout';

interface IScenarioPanelProps {
  lab: LabState;
  actions: IDetectionEngineActions;
}

/** Where the demo starts: set up the lab, then break something and watch the engine react. */
export function ScenarioPanel({ lab, actions }: IScenarioPanelProps) {
  const now = useNow(15_000);
  const isBusy = actions.pendingAction !== undefined;

  if (!lab.ready) {
    return (
      <EuiPanel hasBorder data-test-subj="detectionEngineLabSetup">
        <EuiEmptyPrompt
          iconType="beaker"
          title={
            <h3>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.setupTitle', {
                defaultMessage: 'Set up the demo system',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.setupBody', {
                defaultMessage:
                  'Creates a small shop of four services with three hours of logs, the knowledge the engine would have learned about it, and a baseline for every check. Takes about 15 seconds.',
              })}
            </p>
          }
          actions={
            <EuiButton
              fill
              iconType="beaker"
              data-test-subj="detectionEngineLabSetupButton"
              isLoading={actions.pendingAction === 'labSetup'}
              onClick={() => actions.setupLab()}
            >
              {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.setupButton', {
                defaultMessage: 'Set up demo system',
              })}
            </EuiButton>
          }
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder data-test-subj="detectionEngineLabPanel">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.title', {
            defaultMessage: 'Break something',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.subtitle', {
          defaultMessage:
            'Each scenario changes the logs from now on. The engine sees it when the current minute completes.',
        })}
      </EuiText>
      <EuiSpacer size="s" />

      {lab.incidents.length > 0 && (
        <>
          <EuiPanel color="warning" paddingSize="s" data-test-subj="detectionEngineActiveIncidents">
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.running', {
                      defaultMessage: 'Running now',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              {lab.incidents.map((incident) => (
                <EuiFlexItem grow={false} key={incident.id}>
                  <EuiBadge
                    color="warning"
                    iconType="cross"
                    iconSide="right"
                    iconOnClick={() => actions.stopIncident(incident.id)}
                    iconOnClickAriaLabel={i18n.translate(
                      'xpack.significantEventsApp.detectionEngine.lab.stopIncident',
                      { defaultMessage: 'Stop this incident' }
                    )}
                    data-test-subj={`detectionEngineLabActiveIncident-${incident.service}-${incident.kind}`}
                  >
                    {i18n.translate(
                      'xpack.significantEventsApp.detectionEngine.lab.activeIncident',
                      {
                        defaultMessage: '{kind} on {service}, {ago}',
                        values: {
                          kind: INCIDENT_LABELS[incident.kind],
                          service: incident.service,
                          ago: formatAgo(incident.started_at, now),
                        },
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
              <EuiFlexItem />
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="success"
                  iconType="check"
                  data-test-subj="detectionEngineLabStopAll"
                  isLoading={actions.pendingAction === 'labStop'}
                  onClick={() => actions.stopIncident()}
                >
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.stopAll', {
                    defaultMessage: 'Recover everything',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="s" />
        </>
      )}

      <EuiFlexGroup direction="column" gutterSize="s">
        {DEMO_SCENARIOS.map((scenario) => {
          const running = lab.incidents.some(
            (incident) => incident.service === scenario.service && incident.kind === scenario.kind
          );
          return (
            <EuiFlexItem key={scenario.id}>
              <EuiPanel hasBorder paddingSize="s">
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={scenario.icon} size="l" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{scenario.title}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {scenario.expectation}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      color="warning"
                      iconType="bolt"
                      isDisabled={isBusy || running}
                      data-test-subj={`detectionEngineScenario-${scenario.id}`}
                      onClick={() =>
                        actions.startIncident({ kind: scenario.kind, service: scenario.service })
                      }
                    >
                      {running
                        ? i18n.translate(
                            'xpack.significantEventsApp.detectionEngine.lab.runningButton',
                            { defaultMessage: 'Running' }
                          )
                        : i18n.translate('xpack.significantEventsApp.detectionEngine.lab.start', {
                            defaultMessage: 'Start',
                          })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="s">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="bell" size="l" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate(
                      'xpack.significantEventsApp.detectionEngine.scenario.ruleTitle',
                      {
                        defaultMessage: "The customer's own alert",
                      }
                    )}
                  </strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.scenario.ruleExpectation',
                    {
                      defaultMessage:
                        'Adds a real Kibana rule for checkout 5xx errors. Start a payments outage: when the rule fires, its alert joins the event.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="plusInCircle"
                  isDisabled={isBusy}
                  data-test-subj={`detectionEngineLabCustomerRule-${CUSTOMER_RULE_SERVICE}`}
                  onClick={() => actions.createCustomerRule(CUSTOMER_RULE_SERVICE)}
                >
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.customerRule', {
                    defaultMessage: 'Create rule',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiAccordion
        id="detectionEngineLabAdvanced"
        buttonContent={
          <EuiText size="xs">
            {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.advanced', {
              defaultMessage: 'Advanced: any incident on any service',
            })}
          </EuiText>
        }
        paddingSize="s"
      >
        {lab.services.map((service) => (
          <EuiFlexGroup
            key={service}
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            wrap
            data-test-subj={`detectionEngineLabService-${service}`}
          >
            <EuiFlexItem grow={false} style={{ width: 80 }}>
              <EuiText size="xs">
                <strong>{service}</strong>
              </EuiText>
            </EuiFlexItem>
            {INCIDENT_KINDS.map((kind) => (
              <EuiFlexItem grow={false} key={kind}>
                <EuiButtonEmpty
                  size="xs"
                  isDisabled={
                    isBusy ||
                    lab.incidents.some(
                      (incident) => incident.service === service && incident.kind === kind
                    )
                  }
                  data-test-subj={`detectionEngineLabIncident-${service}-${kind}`}
                  onClick={() => actions.startIncident({ kind, service })}
                >
                  {INCIDENT_LABELS[kind]}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ))}
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.significantEventsApp.detectionEngine.lab.customerRuleTooltip',
                  { defaultMessage: 'Create a Kibana rule for 5xx errors on this service' }
                )}
              >
                <EuiButtonEmpty
                  size="xs"
                  iconType="bell"
                  isDisabled={isBusy}
                  data-test-subj={`detectionEngineLabCustomerRule-${service}-advanced`}
                  onClick={() => actions.createCustomerRule(service)}
                >
                  {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.rule', {
                    defaultMessage: 'Rule',
                  })}
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.dependencies', {
            defaultMessage: 'Logs go to {index}. Dependencies from knowledge: {dependencies}.',
            values: {
              index: lab.index,
              dependencies: lab.dependencies
                .map((dependency) => `${dependency.source} → ${dependency.target}`)
                .join(', '),
            },
          })}
        </EuiText>
      </EuiAccordion>
    </EuiPanel>
  );
}
