/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiEmptyPrompt,
  EuiImage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiButtonTo } from '../../../../../shared/react_router_helpers';

import { getSourcesPath, getAddPath, getEditPath } from '../../../../routes';

import { SourcesLogic } from '../../sources_logic';

import illustration from './illustration.svg';

import './byo_source_prompt.scss';

export const BYOSourcePrompt: React.FC = () => {
  const { externalConfigured } = useValues(SourcesLogic);

  return (
    <EuiEmptyPrompt
      className="byoSourcePrompt"
      icon={<EuiImage size="l" src={illustration} alt="" />}
      title={
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.byoSourcePrompt.title',
            {
              defaultMessage: "Don't see what you're looking for?",
            }
          )}
        </h2>
      }
      layout="horizontal"
      color="plain"
      body={
        <>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.byoSourcePrompt.description',
              {
                defaultMessage: 'Build, modify and deploy a connector package for your use case.',
              }
            )}
          </p>
        </>
      }
      actions={
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              {externalConfigured ? (
                <EuiButtonTo
                  to={getEditPath('external')}
                  color="primary"
                  fill
                  isDisabled={externalConfigured}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.byoSourcePrompt.reviewButtonLabel',
                    {
                      defaultMessage: 'Review your connector package',
                    }
                  )}
                </EuiButtonTo>
              ) : (
                <EuiButtonTo
                  to={getSourcesPath(getAddPath('external'), true) + '/intro'}
                  color="primary"
                  fill
                  isDisabled={externalConfigured}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.byoSourcePrompt.registerButtonLabel',
                    {
                      defaultMessage: 'Register your deployment',
                    }
                  )}
                </EuiButtonTo>
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                href={''} // TODO Update this when we have a doclink
                color="primary"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.byoSourcePrompt.learnMoreButtonLabel',
                  {
                    defaultMessage: 'Learn more',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
    />
  );
};
