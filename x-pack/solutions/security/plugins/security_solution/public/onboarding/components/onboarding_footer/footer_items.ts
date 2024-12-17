/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { COLOR_MODES_STANDARD, useEuiTheme } from '@elastic/eui';
import documentationImage from './images/documentation.png';
import darkDocumentationImage from './images/documentation_dark.png';
import forumImage from './images/forum.png';
import darkForumImge from './images/forum_dark.png';
import demoImage from './images/demo.png';
import darkDemoImage from './images/demo_dark.png';
import labsImage from './images/labs.png';
import darkLabsImage from './images/labs_dark.png';
import { OnboardingFooterLinkItemId } from './constants';

export const useFooterItems = () => {
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;

  const footerItems = [
    {
      icon: isDarkMode ? darkDocumentationImage : documentationImage,
      id: OnboardingFooterLinkItemId.documentation,
      title: i18n.translate('xpack.securitySolution.onboarding.footer.documentation.title', {
        defaultMessage: 'Browse documentation',
      }),
      description: i18n.translate(
        'xpack.securitySolution.onboarding.footer.documentation.description',
        {
          defaultMessage: 'In-depth guides on all Elastic features',
        }
      ),
      link: {
        title: i18n.translate('xpack.securitySolution.onboarding.footer.documentation.link.title', {
          defaultMessage: 'Start reading',
        }),
        href: 'https://docs.elastic.co/integrations/elastic-security-intro',
      },
    },
    {
      icon: isDarkMode ? darkForumImge : forumImage,
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
      icon: isDarkMode ? darkDemoImage : demoImage,
      id: OnboardingFooterLinkItemId.demo,
      title: i18n.translate('xpack.securitySolution.onboarding.footer.demo.title', {
        defaultMessage: 'View demo project',
      }),
      description: i18n.translate('xpack.securitySolution.onboarding.footer.demo.description', {
        defaultMessage: 'Discover Elastic using sample data',
      }),
      link: {
        title: i18n.translate('xpack.securitySolution.onboarding.footer.demo.link.title', {
          defaultMessage: 'Explore demo',
        }),
        href: 'https://www.elastic.co/demo-gallery?solutions=security&features=null',
      },
    },
    {
      icon: isDarkMode ? darkLabsImage : labsImage,
      id: OnboardingFooterLinkItemId.labs,
      title: i18n.translate('xpack.securitySolution.onboarding.footer.labs.title', {
        defaultMessage: 'Elastic Security Labs',
      }),
      description: i18n.translate('xpack.securitySolution.onboarding.footer.labs.description', {
        defaultMessage: 'Insights from security researchers',
      }),
      link: {
        title: i18n.translate('xpack.securitySolution.onboarding.footer.labs.link.title', {
          defaultMessage: 'Learn more',
        }),
        href: 'https://www.elastic.co/security-labs',
      },
    },
  ] as const;

  return footerItems;
};
