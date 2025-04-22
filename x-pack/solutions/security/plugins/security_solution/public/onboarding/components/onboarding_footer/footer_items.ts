/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { OnboardingFooterLinkItemId } from './constants';
import { useKibana } from '../../../common/lib/kibana';

export const useFooterItems = () => {
  const {
    services: { onboarding },
  } = useKibana();

  const projectUrl = useObservable(onboarding.projectUrl$);
  const expandProject = {
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
  };

  const footerItems = [
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
        title: i18n.translate('xpack.securitySolution.onboarding.footer.documentation.link.title', {
          defaultMessage: 'Go to docs',
        }),
        href: 'https://docs.elastic.co/integrations/elastic-security-intro',
      },
    },
    {
      icon: 'users',
      id: OnboardingFooterLinkItemId.forum,
      title: i18n.translate('xpack.securitySolution.onboarding.footer.forum.title', {
        defaultMessage: 'Explore forum',
      }),
      description: i18n.translate('xpack.securitySolution.onboarding.footer.forum.description', {
        defaultMessage: 'Exchange thoughts about Elastic',
      }),
      link: {
        title: i18n.translate('xpack.securitySolution.onboarding.footer.forum.link.title', {
          defaultMessage: 'Discuss Forum',
        }),
        href: 'https://discuss.elastic.co/c/security/83',
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
        href: 'https://www.elastic.co/security-labs',
      },
    },
  ] as const;

  if (projectUrl) {
    return [expandProject, ...footerItems];
  }

  return footerItems;
};
