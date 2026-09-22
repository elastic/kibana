/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { FunctionComponent, ReactElement } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { URL_DEMO_ENV } from '@kbn/home-sample-data-tab/src/constants';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  globalPeopleNetwork,
  observabilityVideo,
  projectsGear,
  supportLaptop,
} from '@elastic/eui-illustrations';
import type { EuiIllustrationSource } from '@elastic/eui-illustrations';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ChromeStart, DocLinksStart } from '@kbn/core/public';

const URL_FORUM = 'https://discuss.elastic.co/';

const linkIllustration = (type: EuiIllustrationSource, maxSize: string): ReactElement => (
  <EuiIllustration type={type} alt="" fullWidth={false} css={{ maxInlineSize: maxSize }} />
);

export const ExternalResourceLinks: FunctionComponent = () => {
  const {
    services: { docLinks, chrome },
  } = useKibana<{ docLinks: DocLinksStart; chrome: ChromeStart }>();
  const { euiTheme } = useEuiTheme();
  const helpSupportUrl = useObservable(chrome.getHelpSupportUrl$());
  const illustrationMaxSize = `calc(${euiTheme.size.base} * 3)`;
  const sections = [
    {
      icon: linkIllustration(observabilityVideo, illustrationMaxSize),
      title: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.demoEnvironmentFlexItemLabel',
        { defaultMessage: 'Demo environment' }
      ),
      description: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.demoEnvironmentFlexItemDescription',
        {
          defaultMessage: 'Explore our live demo environment',
        }
      ),
      linkLabel: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.demoEnvironmentFlexItemLinkLabel',
        { defaultMessage: 'Explore demo' }
      ),
      link: URL_DEMO_ENV,
      testSubject: 'observabilityOnboardingFooterExploreDemoLink',
    },
    {
      icon: linkIllustration(globalPeopleNetwork, illustrationMaxSize),
      title: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.exploreForumFlexItemLabel',
        { defaultMessage: 'Explore forum' }
      ),
      description: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.exploreForumFlexItemDescription',
        {
          defaultMessage: 'Exchange thoughts about Elastic',
        }
      ),
      linkLabel: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.exploreForumFlexItemLinkLabel',
        { defaultMessage: 'Discuss forum' }
      ),
      linkARIALabel: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.exploreForumFlexItemLinkARIALabel',
        { defaultMessage: 'Discuss forum. Open Elastic forum' }
      ),
      link: URL_FORUM,
      testSubject: 'observabilityOnboardingFooterDiscussForumLink',
    },
    {
      icon: linkIllustration(projectsGear, illustrationMaxSize),
      title: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.browseDocumentationFlexItemLabel',
        { defaultMessage: 'Browse documentation' }
      ),
      description: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.browseDocumentationFlexItemDescription',
        {
          defaultMessage: 'In-depth guides on all Elastic features',
        }
      ),
      linkLabel: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.browseDocumentationFlexItemLinkLabel',
        { defaultMessage: 'Learn more' }
      ),
      linkARIALabel: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.browseDocumentationFlexItemLinkARIALabel',
        { defaultMessage: 'Learn more about all Elastic features' }
      ),
      link: docLinks.links.observability.guide,
      testSubject: 'observabilityOnboardingFooterLearnMoreLink',
    },
    {
      icon: linkIllustration(supportLaptop, illustrationMaxSize),
      title: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.supportHubFlexItemLabel',
        { defaultMessage: 'Support Hub' }
      ),
      description: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.supportHubFlexItemDescription',
        {
          defaultMessage: 'Get help by opening a case',
        }
      ),
      linkLabel: i18n.translate(
        'xpack.observabilityShared.experimentalOnboardingFlow.supportHubFlexItemLinkLabel',
        { defaultMessage: 'Open Support Hub' }
      ),
      link: helpSupportUrl,
      testSubject: 'observabilityOnboardingFooterOpenSupportHubLink',
    },
  ];

  const observabilityOnboardingSectionPrefix = useGeneratedHtmlId({
    suffix: 'observabilityOnboardingSection',
  });

  return (
    <EuiFlexGroup gutterSize="xl" justifyContent="center" alignItems="center">
      {sections.map((section, index) => (
        <EuiFlexItem
          key={index}
          grow={false}
          role="group"
          aria-labelledby={`${observabilityOnboardingSectionPrefix}_${index}`}
        >
          {section.icon}
          <EuiSpacer size="m" />
          <EuiText size="s">
            <strong id={`${observabilityOnboardingSectionPrefix}_${index}`}>{section.title}</strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <p>{section.description}</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <p>
              <EuiLink
                data-test-subj={section.testSubject}
                aria-label={section.linkARIALabel}
                href={section.link}
                target="_blank"
                external
              >
                {section.linkLabel}
              </EuiLink>
            </p>
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
