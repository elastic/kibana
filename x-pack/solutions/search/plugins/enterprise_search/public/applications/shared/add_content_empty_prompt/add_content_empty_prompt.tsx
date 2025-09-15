/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiImage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiLink,
  useEuiTheme,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import welcomeGraphicDark from '../../../assets/images/welcome_dark.svg';
import welcomeGraphicLight from '../../../assets/images/welcome_light.svg';

import { docLinks } from '../doc_links';

import './add_content_empty_prompt.scss';

import { KibanaLogic } from '../kibana';
import { EuiLinkTo } from '../react_router_helpers';

export const AddContentEmptyPrompt: React.FC = () => {
  const { colorMode } = useEuiTheme();
  const { share } = useValues(KibanaLogic);
  const createIndexUrl = share?.url.locators.get('SEARCH_CREATE_INDEX')?.useUrl({}) ?? '';

  return (
    <EuiEmptyPrompt
      layout="horizontal"
      title={
        <h2>
          <FormattedMessage
            id="xpack.enterpriseSearch.addContentEmptyPrompt.h2.createYourFirstIndexLabel"
            defaultMessage="Create your first Index"
          />
        </h2>
      }
      body={
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            {i18n.translate(
              'xpack.enterpriseSearch.addContentEmptyPrompt.onceCreatedThisPageLabel',
              {
                defaultMessage: 'Once created, this page will list all of your indices',
              }
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div>
              <EuiLinkTo to={createIndexUrl} shouldNotCreateHref shouldNotPrepend>
                <EuiButton color="primary" fill iconType="plusInCircle">
                  {i18n.translate(
                    'xpack.enterpriseSearch.addContentEmptyPrompt.newIndexButtonLabel',
                    {
                      defaultMessage: 'New Index',
                    }
                  )}
                </EuiButton>
              </EuiLinkTo>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      footer={
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <b>
              {i18n.translate('xpack.enterpriseSearch.addContentEmptyPrompt.wantToLearnMoreLabel', {
                defaultMessage: 'Want to learn more?',
              })}
            </b>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={docLinks.start} target="_blank">
              {i18n.translate('xpack.enterpriseSearch.overview.emptyState.footerLinkTitle', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      hasBorder
      icon={
        <EuiImage
          size="fullWidth"
          src={colorMode === 'LIGHT' ? welcomeGraphicLight : welcomeGraphicDark}
          alt=""
        />
      }
    />
  );
};
