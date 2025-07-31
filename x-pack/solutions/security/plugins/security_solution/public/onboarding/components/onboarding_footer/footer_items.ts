/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { useMemo } from 'react';
import { OnboardingFooterLinkItemId } from './constants';
import { useKibana } from '../../../common/lib/kibana';

export const useFooterItems = () => {
  const {
    services: { onboarding },
  } = useKibana();

  const projectUrl = useObservable(onboarding.projectUrl$);
  const deploymentUrl = useObservable(onboarding.deploymentUrl$);
  const expandProject = useMemo(
    () => ({
      icon: 'arrowUp',
      id: OnboardingFooterLinkItemId.expand,
      title: i18n.translate('xpack.securitySolution.onboarding.footer.expand.title', {
        defaultMessage: 'Expand your project',
      }),
      description: i18n.translate('xpack.securitySolution.onboarding.footer.expand.description', {
        defaultMessage: 'Access Elastic’s full security capabilities',
      }),
      link: {
        title: i18n.translate('xpack.securitySolution.onboarding.footer.expand.link.title', {
          defaultMessage: 'Go to project settings',
        }),
        href: projectUrl ?? '',
      },
    }),
    [projectUrl]
  );

  const manageDeployment = useMemo(
    () => ({
      icon: 'arrowUp',
      id: OnboardingFooterLinkItemId.manageDeployment,
      title: i18n.translate('xpack.securitySolution.onboarding.footer.manageDeployment.title', {
        defaultMessage: 'Manage your deployment',
      }),
      description: i18n.translate(
        'xpack.securitySolution.onboarding.footer.manageDeployment.description',
        {
          defaultMessage: 'Access Elastic’s full security capabilities',
        }
      ),
      link: {
        title: i18n.translate(
          'xpack.securitySolution.onboarding.footer.manageDeployment.link.title',
          {
            defaultMessage: 'Go to settings',
          }
        ),
        href: deploymentUrl ?? '',
      },
    }),
    [deploymentUrl]
  );

  const footerItems = useMemo(
    () =>
      [
        {
          icon: 'documents',
          id: OnboardingFooterLinkItemId.documentation,
          title: i18n.translate('xpack.securitySolution.onboarding.footer.documentation.title', {
            defaultMessage: 'Browse docs',
          }),
          description: i18n.translate(
            'xpack.securitySolution.onboarding.footer.documentation.description',
            {
              defaultMessage: 'In-depth guides for all features',
            }
          ),
          link: {
            title: i18n.translate(
              'xpack.securitySolution.onboarding.footer.documentation.link.title',
              {
                defaultMessage: 'Go to docs',
              }
            ),
            href: 'https://docs.elastic.co/integrations/elastic-security-intro',
          },
        },
        {
          icon: 'users',
          id: OnboardingFooterLinkItemId.slack,
          title: i18n.translate('xpack.securitySolution.onboarding.footer.slack.title', {
            defaultMessage: 'Join the Slack',
          }),
          description: i18n.translate(
            'xpack.securitySolution.onboarding.footer.slack.description',
            {
              defaultMessage: 'Discuss Elastic with fellow users',
            }
          ),
          link: {
            title: i18n.translate('xpack.securitySolution.onboarding.footer.slack.link.title', {
              defaultMessage: 'Go to Elastic community Slack',
            }),
            href: 'https://www.elastic.co/blog/join-our-elastic-stack-workspace-on-slack',
          },
        },
        {
          icon: 'beaker',
          id: OnboardingFooterLinkItemId.labs,
          title: i18n.translate('xpack.securitySolution.onboarding.footer.labs.title', {
            defaultMessage: 'Help improve Elastic Security',
          }),
          description: i18n.translate('xpack.securitySolution.onboarding.footer.labs.description', {
            defaultMessage: 'Meet live with our user research team',
          }),
          link: {
            title: i18n.translate('xpack.securitySolution.onboarding.footer.labs.link.title', {
              defaultMessage: 'Opt into user research',
            }),
            href: 'https://elastic.eu.qualtrics.com/jfe/form/SV_exQvUoHguCio4pE',
          },
        },
      ] as const,
    []
  );

  if (projectUrl) {
    return [expandProject, ...footerItems];
  }

  if (deploymentUrl) {
    return [manageDeployment, ...footerItems];
  }

  return footerItems;
};
