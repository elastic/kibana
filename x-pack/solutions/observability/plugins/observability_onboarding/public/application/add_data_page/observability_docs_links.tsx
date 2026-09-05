/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiIllustration, useEuiTheme } from '@elastic/eui';
import {
  globalPeopleNetwork,
  observabilityVideo,
  projectsGear,
  supportLaptop,
} from '@elastic/eui-illustrations';
import type { EuiIllustrationSource } from '@elastic/eui-illustrations';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';
import type { DocsLink } from '../add_data_grid';

const URL_DEMO_ENV = 'https://ela.st/demo';
const URL_FORUM = 'https://discuss.elastic.co/';

const linkIllustration = (type: EuiIllustrationSource, maxSize: string) => (
  <EuiIllustration type={type} alt="" css={{ maxInlineSize: maxSize }} />
);

/** Destinations carry over from the V1 footer (`ExternalResourceLinks` in `observability_shared`). */
export const useObservabilityDocsLinks = (): DocsLink[] => {
  const {
    services: { docLinks, chrome },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const { euiTheme } = useEuiTheme();
  const helpSupportUrl = useObservable(chrome.getHelpSupportUrl$());
  const documentationUrl = docLinks.links.observability.guide;
  const illustrationMaxSize = `calc(${euiTheme.size.base} * 3)`;

  return useMemo(
    () => [
      {
        id: 'demo',
        title: i18n.translate('xpack.observability_onboarding.docsLinks.demoTitle', {
          defaultMessage: 'Demo environment',
        }),
        description: i18n.translate('xpack.observability_onboarding.docsLinks.demoDescription', {
          defaultMessage: 'Explore our live demo environment.',
        }),
        linkLabel: i18n.translate('xpack.observability_onboarding.docsLinks.demoLinkLabel', {
          defaultMessage: 'Explore demo',
        }),
        href: URL_DEMO_ENV,
        icon: linkIllustration(observabilityVideo, illustrationMaxSize),
        'data-test-subj': 'observabilityOnboardingDocsLinksExploreDemo',
      },
      {
        id: 'forum',
        title: i18n.translate('xpack.observability_onboarding.docsLinks.forumTitle', {
          defaultMessage: 'Elastic forum',
        }),
        description: i18n.translate('xpack.observability_onboarding.docsLinks.forumDescription', {
          defaultMessage: 'Exchange thoughts about Elastic.',
        }),
        linkLabel: i18n.translate('xpack.observability_onboarding.docsLinks.forumLinkLabel', {
          defaultMessage: 'Discuss forum',
        }),
        linkAriaLabel: i18n.translate(
          'xpack.observability_onboarding.docsLinks.forumLinkAriaLabel',
          { defaultMessage: 'Discuss forum. Open Elastic forum' }
        ),
        href: URL_FORUM,
        icon: linkIllustration(globalPeopleNetwork, illustrationMaxSize),
        'data-test-subj': 'observabilityOnboardingDocsLinksDiscussForum',
      },
      {
        id: 'documentation',
        title: i18n.translate('xpack.observability_onboarding.docsLinks.documentationTitle', {
          defaultMessage: 'Documentation',
        }),
        description: i18n.translate(
          'xpack.observability_onboarding.docsLinks.documentationDescription',
          { defaultMessage: 'In-depth guides on all Elastic features.' }
        ),
        linkLabel: i18n.translate(
          'xpack.observability_onboarding.docsLinks.documentationLinkLabel',
          { defaultMessage: 'Learn more' }
        ),
        linkAriaLabel: i18n.translate(
          'xpack.observability_onboarding.docsLinks.documentationLinkAriaLabel',
          { defaultMessage: 'Learn more about all Elastic features' }
        ),
        href: documentationUrl,
        icon: linkIllustration(projectsGear, illustrationMaxSize),
        'data-test-subj': 'observabilityOnboardingDocsLinksLearnMore',
      },
      {
        id: 'support',
        title: i18n.translate('xpack.observability_onboarding.docsLinks.supportTitle', {
          defaultMessage: 'Support Hub',
        }),
        description: i18n.translate('xpack.observability_onboarding.docsLinks.supportDescription', {
          defaultMessage: 'Get help by opening a case.',
        }),
        linkLabel: i18n.translate('xpack.observability_onboarding.docsLinks.supportLinkLabel', {
          defaultMessage: 'Open Support Hub',
        }),
        href: helpSupportUrl,
        icon: linkIllustration(supportLaptop, illustrationMaxSize),
        'data-test-subj': 'observabilityOnboardingDocsLinksOpenSupportHub',
      },
    ],
    [documentationUrl, helpSupportUrl, illustrationMaxSize]
  );
};
