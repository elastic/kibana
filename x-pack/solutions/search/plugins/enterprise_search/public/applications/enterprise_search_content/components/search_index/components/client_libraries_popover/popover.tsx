/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiPopover,
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiText,
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { icons } from '../../../../../../assets/client_libraries';
import { docLinks } from '../../../../../shared/doc_links';

import { IndexViewLogic } from '../../index_view_logic';
import { OverviewLogic } from '../../overview.logic';

const libraries = [
  {
    href: docLinks.clientsJavaIntroduction,
    icon: icons.java,
    key: 'java',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.java',
      { defaultMessage: 'Java' }
    ),
  },
  {
    href: docLinks.clientsJsIntro,
    icon: icons.javascript,
    key: 'javascript',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.javascript',
      { defaultMessage: 'Javascript / Node' }
    ),
  },
  {
    href: docLinks.clientsRubyOverview,
    icon: icons.ruby,
    key: 'ruby',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.ruby',
      { defaultMessage: 'Ruby' }
    ),
  },
  {
    href: docLinks.clientsGoIndex,
    icon: icons.go,
    key: 'go',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.go',
      { defaultMessage: 'Go' }
    ),
  },
  {
    href: docLinks.clientsNetIntroduction,
    icon: icons.dotnet,
    key: 'dotnet',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.dotnet',
      { defaultMessage: '.NET' }
    ),
  },
  {
    href: docLinks.clientsPhpGuide,
    icon: icons.php,
    key: 'php',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.php',
      { defaultMessage: 'PHP' }
    ),
  },
  {
    href: docLinks.clientsPerlGuide,
    icon: icons.perl,
    key: 'perl',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.perl',
      { defaultMessage: 'Perl' }
    ),
  },
  {
    href: docLinks.clientsPythonOverview,
    icon: icons.python,
    key: 'python',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.python',
      { defaultMessage: 'Python' }
    ),
  },
  {
    href: docLinks.clientsRustOverview,
    icon: icons.rust,
    key: 'rust',
    text: i18n.translate(
      'xpack.enterpriseSearch.content.overview.documentExample.clientLibraries.rust',
      { defaultMessage: 'Rust' }
    ),
  },
];

export const ClientLibrariesPopover: React.FC = () => {
  const { isClientsPopoverOpen } = useValues(OverviewLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const { toggleClientsPopover } = useActions(OverviewLogic);

  return (
    <EuiPopover
      isOpen={isClientsPopoverOpen}
      closePopover={toggleClientsPopover}
      button={
        <EuiButton
          data-telemetry-id={`entSearchContent-${ingestionMethod}-overview-clientLibraries-openClientLibraries`}
          iconType="arrowDown"
          iconSide="right"
          onClick={toggleClientsPopover}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.content,overview.documentExample.clientLibraries.label',
            { defaultMessage: 'Client Libraries' }
          )}
        </EuiButton>
      }
    >
      <EuiContextMenuPanel
        size="s"
        items={libraries.map((item) => (
          <EuiContextMenuItem
            key={item.key}
            href={item.href}
            target="_blank"
            icon={item.icon ? <EuiIcon type={item.icon} size="l" /> : undefined}
          >
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <EuiText>
                  <p>{item.text}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="popout" size="m" color="primary" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
