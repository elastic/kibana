/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DocCallouts } from './doc_callouts';
import { docLinks } from '../../common/doc_links';
interface DocLinkItem {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  dataTestSubj: string;
}

export const GettingStartedFooter = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();

  const footerLinks: DocLinkItem[] = [
    {
      id: 'searchLabs',
      title: i18n.translate('xpack.gettingStarted.searchLabs.title', {
        defaultMessage: 'Search Labs',
      }),
      description: i18n.translate('xpack.gettingStarted.searchLabs.description', {
        defaultMessage:
          'Explore the latest articles and tutorials on using Elasticsearch for AI/ML-powered search experiences.',
      }),
      buttonLabel: i18n.translate('xpack.gettingStarted.searchLabs.buttonText', {
        defaultMessage: 'Visit Elasticsearch Labs',
      }),
      buttonHref: docLinks.visitSearchLabs,
      dataTestSubj: 'gettingStartedSearchLabs',
    },
    {
      id: 'pythonNotebooks',
      title: i18n.translate('xpack.gettingStarted.pythonNotebooks.title', {
        defaultMessage: 'Python notebooks',
      }),
      description: i18n.translate('xpack.gettingStarted.pythonNotebooks.description', {
        defaultMessage:
          'A range of executable Python notebooks available to easily test features in a virtual environment.',
      }),
      buttonLabel: i18n.translate('xpack.gettingStarted.pythonNotebooks.buttonText', {
        defaultMessage: 'Browse our notebooks',
      }),
      buttonHref: docLinks.notebooksExamples,
      dataTestSubj: 'gettingStartedOpenNotebooks',
    },
    {
      id: 'elasticsearchDocs',
      title: i18n.translate('xpack.gettingStarted.elasticsearchDocs.title', {
        defaultMessage: 'Elasticsearch documentation',
      }),
      description: i18n.translate('xpack.gettingStarted.elasticsearchDocumentation.description', {
        defaultMessage:
          'Comprehensive reference material to help you learn, build, and deploy search solutions with Elasticsearch.',
      }),
      buttonLabel: i18n.translate('xpack.gettingStarted.elasticsearchDocumentation.buttonText', {
        defaultMessage: 'View documentation',
      }),
      buttonHref: docLinks.elasticsearchDocs,
      dataTestSubj: 'gettingStartedViewDocumentation',
    },
  ];
  return (
    <>
      <EuiHorizontalRule />
      <EuiSpacer size="xxl" />
      <EuiFlexGroup direction={currentBreakpoint === 'xl' ? 'row' : 'column'}>
        {footerLinks.map((item) => (
          <EuiFlexItem key={item.dataTestSubj} data-test-subj={item.dataTestSubj}>
            <DocCallouts
              title={item.title}
              description={item.description}
              buttonHref={item.buttonHref}
              buttonLabel={item.buttonLabel}
              dataTestSubj={`${item.dataTestSubj}-btn`}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
    </>
  );
};
