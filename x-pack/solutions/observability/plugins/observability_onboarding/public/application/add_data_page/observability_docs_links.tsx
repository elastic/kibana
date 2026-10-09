/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';
import type { DocsLink } from '../add_data_grid';
import demoIconUrl from './icons/demo_icon.svg';
import forumIconUrl from './icons/forum_icon.svg';
import docsIconUrl from './icons/docs_icon.svg';
import supportIconUrl from './icons/support_icon.svg';

const URL_DEMO_ENV = 'https://ela.st/demo';
const URL_FORUM = 'https://discuss.elastic.co/';

const linkIcon = (iconUrl: string) => (
  <EuiIcon size="xl" type={iconUrl} color="subdued" aria-hidden={true} />
);

/** Destinations carry over from the V1 footer (`ExternalResourceLinks` in `observability_shared`). */
export const useObservabilityDocsLinks = (): DocsLink[] => {
  const {
    services: { docLinks, chrome },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const helpSupportUrl = useObservable(chrome.getHelpSupportUrl$());
  const documentationUrl = docLinks.links.observability.guide;

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
        icon: linkIcon(demoIconUrl),
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
        icon: linkIcon(forumIconUrl),
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
        icon: linkIcon(docsIconUrl),
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
        icon: linkIcon(supportIconUrl),
        'data-test-subj': 'observabilityOnboardingDocsLinksOpenSupportHub',
      },
    ],
    [documentationUrl, helpSupportUrl]
  );
};
