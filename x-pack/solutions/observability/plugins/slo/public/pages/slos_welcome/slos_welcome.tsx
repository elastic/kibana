/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { paths, SLOS_PATH } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { SloOutdatedCallout } from '../../components/slo/slo_outdated_callout';
import { SloPermissionsCallout } from '../../components/slo/slo_permissions_callout';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { LoadingPage } from '../loading_page';
import illustration from './assets/illustration.svg';

export function SlosWelcomePage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
    docLinks,
    serverless,
  } = useKibana().services;

  const { ObservabilityPageTemplate } = usePluginContext();
  const { data: permissions } = usePermissions();
  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');
  const history = useHistory();

  const { data: { total } = { total: 0 }, isLoading } = useFetchSloDefinitions({ perPage: 0 });

  const hasSlosAndPermissions =
    !isLoading && total > 0 && hasRightLicense && permissions?.hasAllReadRequested === true;

  const handleClickCreateSlo = () => {
    navigateToUrl(basePath.prepend(paths.sloCreate));
  };

  useEffect(() => {
    if (hasSlosAndPermissions) {
      history.replace(SLOS_PATH);
    }
  }, [hasSlosAndPermissions, history]);

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slos),
        text: i18n.translate('xpack.slo.breadcrumbs.slosLinkText', {
          defaultMessage: 'SLOs',
        }),
        deepLinkId: 'slo',
      },
    ],
    { serverless }
  );

  if (isLoading) {
    return <LoadingPage dataTestSubj="sloWelcomePageLoading" />;
  }

  return (
    <ObservabilityPageTemplate data-test-subj="sloWelcomePage">
      <HeaderMenu />
      <SloOutdatedCallout />
      <SloPermissionsCallout />
      <EuiPageTemplate.EmptyPrompt
        title={
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.slo.sloList.welcomePrompt.title', {
                defaultMessage: 'Track and deliver on your SLOs',
              })}
            </h1>
          </EuiTitle>
        }
        icon={<EuiImage size="fullWidth" src={illustration} alt="" />}
        color="transparent"
        layout="horizontal"
        hasBorder={false}
        body={
          <>
            <p>
              {i18n.translate('xpack.slo.sloList.welcomePrompt.messageParagraph1', {
                defaultMessage:
                  'Measure key metrics important to the business, such as service-level indicators and service-level objectives (SLIs/SLOs) to deliver on SLAs.',
              })}
            </p>

            <p>
              {i18n.translate('xpack.slo.sloList.welcomePrompt.messageParagraph2', {
                defaultMessage:
                  'Easily report the uptime and reliability of your services to stakeholders with real-time insights.',
              })}
            </p>
            <EuiSpacer size="s" />
          </>
        }
        actions={
          <>
            {hasRightLicense ? (
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <span>
                      {i18n.translate('xpack.slo.sloList.welcomePrompt.getStartedMessage', {
                        defaultMessage: 'To get started, create your first SLO.',
                      })}
                    </span>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem>
                  <span>
                    <EuiButton
                      data-test-subj="o11ySloListWelcomePromptCreateSloButton"
                      fill
                      color="primary"
                      onClick={handleClickCreateSlo}
                      disabled={!permissions?.hasAllWriteRequested}
                    >
                      {i18n.translate('xpack.slo.sloList.welcomePrompt.buttonLabel', {
                        defaultMessage: 'Create SLO',
                      })}
                    </EuiButton>
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="xxs">
                    <span>
                      {i18n.translate('xpack.slo.sloList.welcomePrompt.needLicenseMessage', {
                        defaultMessage:
                          'You need an Elastic Cloud subscription or Platinum license to use SLOs.',
                      })}
                    </span>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup direction="row">
                    <EuiFlexItem>
                      <EuiButton
                        fill
                        href="https://www.elastic.co/cloud/elasticsearch-service/signup"
                        target="_blank"
                        data-test-subj="sloWelcomePageSignupForCloudButton"
                      >
                        {i18n.translate('xpack.slo.sloList.welcomePrompt.signupForCloud', {
                          defaultMessage: 'Sign up for Elastic Cloud',
                        })}
                      </EuiButton>
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiButton
                        href="https://www.elastic.co/subscriptions"
                        target="_blank"
                        data-test-subj="sloWelcomePageSignupForLicenseButton"
                      >
                        {i18n.translate('xpack.slo.sloList.welcomePrompt.signupForLicense', {
                          defaultMessage: 'Sign up for license',
                        })}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </>
        }
        footer={
          <>
            <EuiTitle size="xxs">
              <span>
                {i18n.translate('xpack.slo.sloList.welcomePrompt.learnMore', {
                  defaultMessage: 'Want to learn more?',
                })}
              </span>
            </EuiTitle>
            &nbsp;
            <EuiLink
              data-test-subj="o11ySloListWelcomePromptReadTheDocsLink"
              href={docLinks.links.observability.slo}
              target="_blank"
            >
              {i18n.translate('xpack.slo.sloList.welcomePrompt.learnMoreLink', {
                defaultMessage: 'Read the docs',
              })}
            </EuiLink>
          </>
        }
      />
    </ObservabilityPageTemplate>
  );
}
