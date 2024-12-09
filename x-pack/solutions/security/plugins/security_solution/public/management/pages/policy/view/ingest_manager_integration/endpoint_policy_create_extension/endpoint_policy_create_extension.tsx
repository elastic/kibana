/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  EuiCallOut,
  EuiCode,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiRadio,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PackagePolicyCreateExtensionComponentProps } from '@kbn/fleet-plugin/public';
import type { EndpointPreset } from './constants';
import { ENDPOINT_INTEGRATION_CONFIG_KEY, endpointPresetsMapping } from './constants';
import { HelpTextWithPadding } from './components/help_text_with_padding';
import { EndpointEventCollectionPreset } from './components/endpoint_event_collection_preset';
import { useLicense } from '../../../../../../common/hooks/use_license';
import {
  ALL_EVENTS,
  CLOUD_SECURITY,
  DATA_COLLECTION_HELP_TEXT,
  ENDPOINT,
  INTERACTIVE_ONLY,
} from './translations';
import { useGetProtectionsUnavailableComponent } from '../../policy_settings_form/hooks/use_get_protections_unavailable_component';

const PREFIX = 'endpoint_policy_create_extension';

const environmentMapping = {
  cloud: CLOUD_SECURITY,
  endpoint: ENDPOINT,
};

const cloudEventMapping = {
  INTERACTIVE_ONLY,
  ALL_EVENTS,
};

type CloudEvent = keyof typeof cloudEventMapping;
type Environment = keyof typeof environmentMapping;

const environmentOptions: Array<{ value: Environment; text: string }> = [
  { value: 'endpoint', text: ENDPOINT },
  { value: 'cloud', text: CLOUD_SECURITY },
];

/**
 * Exports Endpoint-specific package policy instructions
 * for use in the Ingest app create / edit package policy
 */
export const EndpointPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  ({ newPolicy, onChange }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isEnterprise = useLicense().isEnterprise();
    const showEndpointEventCollectionOnlyPreset = Boolean(useGetProtectionsUnavailableComponent());

    const [endpointPreset, setEndpointPreset] = useState<EndpointPreset>('EDRComplete');
    const [selectedCloudEvent, setSelectedCloudEvent] = useState<CloudEvent>('INTERACTIVE_ONLY');
    const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>('endpoint');

    // Show NGAV license note when Gold and below
    // Show EDR licenses note when Platinum and Below
    const showNote =
      (endpointPreset === 'NGAV' && !isPlatinumPlus) ||
      (['EDREssential', 'EDRComplete'].includes(endpointPreset) && !isEnterprise);

    // Fleet will initialize the create form with a default name for the integrating policy, however,
    // for endpoint security, we want the user to explicitly type in a name, so we blank it out
    // only during 1st component render (thus why the eslint disabled rule below).
    // Default values for config are endpoint + NGAV
    useEffect(() => {
      // When ONLY Data collection is allowed, the updates to the policy are handled by the
      // EndpointEventCollectionPreset component
      if (
        !showEndpointEventCollectionOnlyPreset ||
        (showEndpointEventCollectionOnlyPreset && selectedEnvironment === 'cloud')
      ) {
        if (newPolicy.inputs.length === 0) {
          onChange({
            isValid: false,
            updatedPolicy: {
              ...newPolicy,
              name: '',
              inputs: [
                {
                  enabled: true,
                  streams: [],
                  type: ENDPOINT_INTEGRATION_CONFIG_KEY,
                  config: {
                    _config: {
                      value: {
                        type: 'endpoint',
                        endpointConfig: {
                          preset: 'NGAV',
                        },
                      },
                    },
                  },
                },
              ],
            },
          });
        } else {
          onChange({
            isValid: true,
            updatedPolicy: {
              ...newPolicy,
              inputs: [
                {
                  ...newPolicy.inputs[0],
                  config: {
                    _config: {
                      value: {
                        type: selectedEnvironment,
                        ...(selectedEnvironment === 'cloud'
                          ? {
                              eventFilters: {
                                nonInteractiveSession: selectedCloudEvent === 'INTERACTIVE_ONLY',
                              },
                            }
                          : {
                              endpointConfig: {
                                preset: endpointPreset,
                              },
                            }),
                      },
                    },
                  },
                },
              ],
            },
          });
        }
      }
    }, [
      selectedEnvironment,
      selectedCloudEvent,
      endpointPreset,
      onChange,
      newPolicy,
      showEndpointEventCollectionOnlyPreset,
    ]);

    const onChangeEnvironment = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedEnvironment(e?.target?.value as Environment);
    }, []);
    const onChangeCloudEvent = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedCloudEvent(e.target.value as CloudEvent);
    }, []);
    const onChangeEndpointPreset = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setEndpointPreset(e.target.value as EndpointPreset);
    }, []);

    const getEndpointPresetsProps = useCallback(
      (preset: EndpointPreset) => ({
        id: `${PREFIX}_endpoint_preset_${preset}`,
        label: endpointPresetsMapping[preset].label,
        value: preset,
        checked: endpointPreset === preset,
        onChange: onChangeEndpointPreset,
      }),
      [endpointPreset, onChangeEndpointPreset]
    );

    const getCloudEventsProps = useCallback(
      (cloudEvent: CloudEvent) => ({
        id: `${PREFIX}_cloud_event_${cloudEvent}`,
        label: cloudEventMapping[cloudEvent],
        value: cloudEvent,
        checked: selectedCloudEvent === cloudEvent,
        onChange: onChangeCloudEvent,
      }),
      [selectedCloudEvent, onChangeCloudEvent]
    );

    return (
      <EuiForm component="form">
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.createPackagePolicy.stepConfigure.enablePrevention"
              defaultMessage="Select configuration settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.createPackagePolicy.stepConfigure.quickSettingsTranslation"
              defaultMessage="Use quick settings to configure the integration to {environments}. You can make configuration changes after you create the integration."
              values={{
                environments: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.ingestManager.createPackagePolicy.environments"
                      defaultMessage="protect your traditional endpoints or dynamic cloud environments"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.securitySolution.createPackagePolicy.stepConfigure.selectEnvironmentTextTranslation"
              defaultMessage="Select the type of environment you want to protect:"
            />
          }
        >
          <EuiSelect
            id="selectIntegrationTypeId"
            data-test-subj="selectIntegrationTypeId"
            options={environmentOptions}
            value={selectedEnvironment}
            onChange={onChangeEnvironment}
            fullWidth={true}
          />
        </EuiFormRow>

        {selectedEnvironment === 'endpoint' ? (
          !showEndpointEventCollectionOnlyPreset ? (
            <>
              <EuiSpacer size="m" />
              <EuiFormRow
                fullWidth
                helpText={<HelpTextWithPadding>{DATA_COLLECTION_HELP_TEXT}</HelpTextWithPadding>}
              >
                <EuiRadio {...getEndpointPresetsProps('DataCollection')} />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiFormRow
                fullWidth
                helpText={
                  <HelpTextWithPadding>
                    <FormattedMessage
                      id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeEndpointNGAV"
                      defaultMessage="Machine learning malware, ransomware, memory threat, malicious behavior, and credential theft preventions, plus process telemetry"
                    />
                  </HelpTextWithPadding>
                }
              >
                <EuiRadio {...getEndpointPresetsProps('NGAV')} />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiFormRow
                fullWidth
                helpText={
                  <HelpTextWithPadding>
                    <FormattedMessage
                      id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeEndpointEDREssential"
                      defaultMessage="Everything in NGAV, plus file and network telemetry"
                    />
                  </HelpTextWithPadding>
                }
              >
                <EuiRadio {...getEndpointPresetsProps('EDREssential')} />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiFormRow
                fullWidth
                helpText={
                  <HelpTextWithPadding>
                    <FormattedMessage
                      id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeEndpointEDRComplete"
                      defaultMessage="Everything in Essential EDR, plus full telemetry"
                    />
                  </HelpTextWithPadding>
                }
              >
                <EuiRadio {...getEndpointPresetsProps('EDRComplete')} />
              </EuiFormRow>

              {showNote && (
                <>
                  <EuiSpacer size="m" />
                  <EuiCallOut iconType="iInCircle">
                    <EuiText size="s" data-test-subj="create-ensdpoint-policy-license-note">
                      <p>
                        {endpointPresetsMapping[endpointPreset].note}{' '}
                        <FormattedMessage
                          id="xpack.securitySolution.createPackagePolicy.stepConfigure.seeDocumentation"
                          defaultMessage="See {documentation} for more information."
                          values={{
                            documentation: (
                              <EuiLink
                                href="https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html"
                                target="_blank"
                              >
                                <FormattedMessage
                                  id="xpack.securitySolution.endpoint.ingestManager.createPackagePolicy.seeDocumentationLink"
                                  defaultMessage="documentation"
                                />
                              </EuiLink>
                            ),
                          }}
                        />
                      </p>
                    </EuiText>
                  </EuiCallOut>
                </>
              )}
            </>
          ) : (
            <EndpointEventCollectionPreset onChange={onChange} newPolicy={newPolicy} />
          )
        ) : (
          <>
            <EuiSpacer size="m" />
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.createPackagePolicy.stepConfigure.interactiveSessionSuggestionTranslation"
                  defaultMessage="To reduce data ingestion volume, select Interactive only"
                />
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              helpText={
                <HelpTextWithPadding>
                  <FormattedMessage
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeAllEventsInfo"
                    defaultMessage="Monitors and collects data from all system executions, including those launched by daemon processes, such as {nginx}, {postgres} and {cron}. {recommendation}"
                    values={{
                      nginx: <EuiCode>{'nginx'}</EuiCode>,
                      postgres: <EuiCode>{'postgres'}</EuiCode>,
                      cron: <EuiCode>{'cron'}</EuiCode>,
                      recommendation: (
                        <em>
                          <strong>
                            <FormattedMessage
                              id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeAllEventsInfoRecommendation"
                              defaultMessage="Recommended for Cloud Workload Protection, auditing and forensics use cases."
                            />
                          </strong>
                        </em>
                      ),
                    }}
                  />
                </HelpTextWithPadding>
              }
            >
              <EuiRadio {...getCloudEventsProps('ALL_EVENTS')} />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiFormRow
              fullWidth
              helpText={
                <HelpTextWithPadding>
                  <FormattedMessage
                    id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeInteractiveOnlyInfo"
                    defaultMessage="Captures live system interactions initiated by users through programs like {ssh} or {telnet}. {recommendation}"
                    values={{
                      ssh: <EuiCode>{'ssh'}</EuiCode>,
                      telnet: <EuiCode>{'telnet'}</EuiCode>,
                      recommendation: (
                        <em>
                          <strong>
                            <FormattedMessage
                              id="xpack.securitySolution.createPackagePolicy.stepConfigure.packagePolicyTypeInteractiveOnlyInfoRecommendation"
                              defaultMessage="Recommended for auditing and forensic use cases."
                            />
                          </strong>
                        </em>
                      ),
                    }}
                  />
                </HelpTextWithPadding>
              }
            >
              <EuiRadio {...getCloudEventsProps('INTERACTIVE_ONLY')} />
            </EuiFormRow>
          </>
        )}
        <EuiSpacer size="xl" />
      </EuiForm>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.newPolicy.name === nextProps.newPolicy.name;
  }
);
EndpointPolicyCreateExtension.displayName = 'EndpointPolicyCreateExtension';
