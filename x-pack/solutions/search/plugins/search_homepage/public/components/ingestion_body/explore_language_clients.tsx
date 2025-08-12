/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiLink, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../common/doc_links';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

const LanguageIcons = [
  {
    id: 'python',
    icon: 'python.svg',
    title: i18n.translate('xpack.searchHomepage.exploreLanguageClients.python.title', {
      defaultMessage: 'Python logo',
    }),
  },
  {
    id: 'javascript',
    icon: 'javascript.svg',
    title: i18n.translate('xpack.searchHomepage.exploreLanguageClients.js.title', {
      defaultMessage: 'Javascript logo',
    }),
  },
  {
    id: 'php',
    icon: 'php.svg',
    title: i18n.translate('xpack.searchHomepage.exploreLanguageClients.php.title', {
      defaultMessage: 'PHP logo',
    }),
  },
  {
    id: 'golang',
    icon: 'go.svg',
    title: i18n.translate('xpack.searchHomepage.exploreLanguageClients.golang.title', {
      defaultMessage: 'Go language logo',
    }),
  },
  {
    id: 'ruby',
    icon: 'ruby.svg',
    title: i18n.translate('xpack.searchHomepage.exploreLanguageClients.ruby.title', {
      defaultMessage: 'Ruby logo',
    }),
  },
];

export const ExploreLanguageClients = () => {
  const { euiTheme } = useEuiTheme();
  const assetBasePath = useAssetBasePath();

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexStart"
      gutterSize="l"
      wrap
      css={css({
        borderLeft: euiTheme.border.thin,
        paddingLeft: euiTheme.size.m,
      })}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs">
          {LanguageIcons.map((icon) => (
            <EuiFlexItem
              key={icon.id}
              grow={false}
              css={css({
                border: euiTheme.border.thin,
                borderRadius: euiTheme.border.radius.small,
                padding: euiTheme.size.xs,
              })}
            >
              <EuiIcon
                type={`${assetBasePath}/${icon.icon}`}
                size="l"
                title={icon.title}
                aria-label={icon.title}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink
          href={docLinks.languageClients}
          target="_blank"
          data-test-subj="exploreLangClientsLink"
        >
          {i18n.translate('xpack.searchHomepage.exploreLanguageClients.link', {
            defaultMessage: 'Explore our language clients',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
