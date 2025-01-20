/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { AsyncStatus, useAsync } from '../hooks/use_async';
import { useAutoAbortedHttpClient } from '../hooks/use_auto_aborted_http_client';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { AddDataTabs } from '../views/add_data_view';
import { useLicenseContext } from './contexts/license/use_license_context';
import { useProfilingDependencies } from './contexts/profiling_dependencies/use_profiling_dependencies';
import { LicensePrompt } from './license_prompt';
import { ProfilingAppPageTemplate } from './profiling_app_page_template';
import { useProfilingSetupStatus } from './contexts/profiling_setup_status/use_profiling_setup_status';

export function CheckSetup({ children }: { children: React.ReactElement }) {
  const {
    start: { core },
    services: { fetchHasSetup, postSetupResources },
  } = useProfilingDependencies();
  const { setProfilingSetupStatus } = useProfilingSetupStatus();
  const license = useLicenseContext();
  const router = useProfilingRouter();
  const history = useHistory();

  const { docLinks, notifications } = core;

  const [postSetupLoading, setPostSetupLoading] = useState(false);

  const { status, data, error, refresh } = useAsync(
    ({ http }) => {
      return fetchHasSetup({ http });
    },
    [fetchHasSetup]
  );

  if (status === AsyncStatus.Settled) {
    setProfilingSetupStatus(data);
  }

  const http = useAutoAbortedHttpClient([]);

  if (!license?.hasAtLeast('enterprise')) {
    return (
      <ProfilingAppPageTemplate hideSearchBar tabs={[]}>
        <LicensePrompt />
      </ProfilingAppPageTemplate>
    );
  }

  const displayLoadingScreen = status !== AsyncStatus.Settled;

  if (displayLoadingScreen) {
    return (
      <ProfilingAppPageTemplate hideSearchBar tabs={[]}>
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>
              {i18n.translate('xpack.profiling.noDataConfig.loading.loaderText', {
                defaultMessage: 'Loading data sources',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ProfilingAppPageTemplate>
    );
  }

  const displaySetupScreen =
    (status === AsyncStatus.Settled &&
      data?.has_setup !== true &&
      data?.pre_8_9_1_data === false) ||
    !!error;

  if (displaySetupScreen) {
    const isButtonDisabled = postSetupLoading || data?.has_required_role === false;
    return (
      <ProfilingAppPageTemplate
        tabs={[]}
        noDataConfig={{
          docsLink: `${docLinks.ELASTIC_WEBSITE_URL}/guide/en/observability/${docLinks.DOC_LINK_VERSION}/profiling-get-started.html`,
          logo: 'logoObservability',
          pageTitle: i18n.translate('xpack.profiling.noDataConfig.pageTitle', {
            defaultMessage: 'Universal Profiling',
          }),
          action: {
            elasticAgent: {
              description: (
                <EuiFlexGrid gutterSize="s">
                  <EuiText>
                    {i18n.translate('xpack.profiling.noDataConfig.action.title', {
                      defaultMessage: `Universal Profiling provides fleet-wide, whole-system, continuous profiling with zero instrumentation.
                Understand what lines of code are consuming compute resources, at all times, and across your entire infrastructure.`,
                    })}
                  </EuiText>
                  <EuiCallOut
                    size="s"
                    color="warning"
                    title={i18n.translate(
                      'xpack.profiling.noDataConfig.action.permissionsWarning',
                      {
                        defaultMessage:
                          'To setup Universal Profiling, you must be logged in as a superuser.',
                      }
                    )}
                  />
                  <EuiText size={'xs'}>
                    <ul>
                      <li>
                        <FormattedMessage
                          id="xpack.profiling.noDataConfig.action.dataRetention"
                          defaultMessage="Normal data storage costs apply for profiling data stored in Elasticsearch. Learn more about {dataRetentionLink}."
                          values={{
                            dataRetentionLink: (
                              <EuiLink
                                data-test-subj="profilingCheckSetupControllingDataRetentionLink"
                                href={`${docLinks.ELASTIC_WEBSITE_URL}/guide/en/elasticsearch/reference/${docLinks.DOC_LINK_VERSION}/set-up-lifecycle-policy.html`}
                                target="_blank"
                              >
                                {i18n.translate(
                                  'xpack.profiling.noDataConfig.action.dataRetention.link',
                                  { defaultMessage: 'controlling data retention' }
                                )}
                              </EuiLink>
                            ),
                          }}
                        />
                      </li>
                    </ul>
                  </EuiText>
                  <EuiText size={'xs'} />
                </EuiFlexGrid>
              ),
              onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
                event.preventDefault();
              },
              button: (
                <EuiToolTip
                  content={
                    data?.has_required_role === false
                      ? i18n.translate('xpack.profiling.checkSetup.tooltip', {
                          defaultMessage: 'You must be logged in as a superuser',
                        })
                      : ''
                  }
                >
                  <EuiButton
                    data-test-subj="profilingCheckSetupButton"
                    disabled={isButtonDisabled}
                    onClick={(event) => {
                      event.preventDefault();

                      setPostSetupLoading(true);

                      postSetupResources({ http })
                        .then(() => refresh())
                        .catch((err) => {
                          const message = err?.body?.message ?? err.message ?? String(err);

                          notifications.toasts.addError(err, {
                            title: i18n.translate(
                              'xpack.profiling.checkSetup.setupFailureToastTitle',
                              {
                                defaultMessage: 'Failed to complete setup',
                              }
                            ),
                            toastMessage: message,
                          });
                        })
                        .finally(() => {
                          setPostSetupLoading(false);
                        });
                    }}
                    fill
                    isLoading={postSetupLoading}
                  >
                    {!postSetupLoading
                      ? i18n.translate('xpack.profiling.noDataConfig.action.buttonLabel', {
                          defaultMessage: 'Set up Universal Profiling',
                        })
                      : i18n.translate('xpack.profiling.noDataConfig.action.buttonLoadingLabel', {
                          defaultMessage: 'Setting up Universal Profiling...',
                        })}
                  </EuiButton>
                </EuiToolTip>
              ),
            },
          },
          solution: i18n.translate('xpack.profiling.noDataConfig.solutionName', {
            defaultMessage: 'Universal Profiling',
          }),
        }}
        hideSearchBar
      >
        <></>
      </ProfilingAppPageTemplate>
    );
  }

  const displayUi =
    // Display UI if there's data or if the user is opening the add data instruction page.
    // does not use profiling router because that breaks as at this point the route might not have all required params
    (data?.has_data === true && data?.pre_8_9_1_data === false) ||
    history.location.pathname === '/add-data-instructions' ||
    history.location.pathname === '/delete_data_instructions';

  if (displayUi) {
    return children;
  }

  if (data?.pre_8_9_1_data === true) {
    // If the cluster still has data pre 8.9.1 version, redirect to deleting instructions
    router.push('/delete_data_instructions', {
      path: {},
      query: {},
    });
    return null;
  }

  if (status === AsyncStatus.Settled && data?.has_setup === true && data?.has_data === false) {
    // when there's no data redirect the user to the add data instructions page
    router.push('/add-data-instructions', {
      path: {},
      query: { selectedTab: AddDataTabs.Kubernetes },
    });
    return null;
  }

  throw new Error('Invalid state');
}
