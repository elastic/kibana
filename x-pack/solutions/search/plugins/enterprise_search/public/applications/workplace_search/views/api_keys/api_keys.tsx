/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiTitle,
  EuiPanel,
  EuiCopy,
  EuiButtonIcon,
  EuiSpacer,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { docLinks } from '../../../shared/doc_links';
import { externalUrl } from '../../../shared/enterprise_search_url/external_url';

import { WorkplaceSearchPageTemplate } from '../../components/layout';
import { NAV, API_KEYS_TITLE } from '../../constants';

import { ApiKeysLogic } from './api_keys_logic';
import { ApiKeyFlyout } from './components/api_key_flyout';
import { ApiKeysList } from './components/api_keys_list';
import {
  API_KEYS_EMPTY_TITLE,
  API_KEYS_EMPTY_BODY,
  API_KEYS_EMPTY_BUTTON_LABEL,
  CREATE_KEY_BUTTON_LABEL,
  ENDPOINT_TITLE,
  COPIED_TOOLTIP,
  COPY_API_ENDPOINT_BUTTON_LABEL,
} from './constants';

export const ApiKeys: React.FC = () => {
  const { fetchApiKeys, resetApiKeys, showApiKeyForm } = useActions(ApiKeysLogic);

  const { meta, dataLoading, apiKeyFormVisible, apiTokens } = useValues(ApiKeysLogic);

  useEffect(() => {
    fetchApiKeys();
    return resetApiKeys;
  }, [meta.page.current]);

  const hasApiKeys = apiTokens.length > 0;

  const addKeyButton = (
    <EuiButton fill onClick={showApiKeyForm}>
      {CREATE_KEY_BUTTON_LABEL}
    </EuiButton>
  );

  const emptyPrompt = (
    <EuiEmptyPrompt
      iconType="editorStrike"
      title={<h2>{API_KEYS_EMPTY_TITLE}</h2>}
      body={API_KEYS_EMPTY_BODY}
      actions={
        <EuiButton
          size="s"
          target="_blank"
          iconType="popout"
          href={docLinks.workplaceSearchApiKeys}
        >
          {API_KEYS_EMPTY_BUTTON_LABEL}
        </EuiButton>
      }
    />
  );

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[NAV.API_KEYS]}
      pageHeader={{
        pageTitle: API_KEYS_TITLE,
        rightSideItems: [addKeyButton],
      }}
      isLoading={dataLoading}
      emptyState={!hasApiKeys && emptyPrompt}
    >
      {apiKeyFormVisible && <ApiKeyFlyout />}
      <EuiPanel color="subdued" className="eui-textCenter">
        <EuiTitle size="s">
          <h2>{ENDPOINT_TITLE}</h2>
        </EuiTitle>
        <EuiCopy textToCopy={externalUrl.enterpriseSearchUrl} afterMessage={COPIED_TOOLTIP}>
          {(copy) => (
            <>
              <EuiButtonIcon
                onClick={copy}
                iconType="copyClipboard"
                aria-label={COPY_API_ENDPOINT_BUTTON_LABEL}
              />
              {externalUrl.enterpriseSearchUrl}
            </>
          )}
        </EuiCopy>
      </EuiPanel>
      <EuiSpacer size="xxl" />
      <EuiPanel hasBorder>{hasApiKeys ? <ApiKeysList /> : emptyPrompt}</EuiPanel>
    </WorkplaceSearchPageTemplate>
  );
};
