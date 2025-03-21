/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { PromptContext } from '@kbn/elastic-assistant';
import {
  AlertSummary,
  AttackDiscoveryWidget,
  Conversations,
  SuggestedPrompts,
} from '@kbn/elastic-assistant';
import { css } from '@emotion/react';
import { DocumentDetailsProvider } from '../document_details/shared/context';
import { HighlightedFields } from '../document_details/right/components/highlighted_fields';
import { useKibana } from '../../common/lib/kibana';
import { getField } from '../document_details/shared/utils';
import { getRawData } from '../../assistant/helpers';
import { useAIForSOCDetailsContext } from './context';
import { FlyoutBody } from '../shared/components/flyout_body';
import { FlyoutNavigation } from '../shared/components/flyout_navigation';
import type { AIForSOCDetailsProps } from './types';
import { PanelFooter } from './footer';
import { FLYOUT_BODY_TEST_ID } from './test_ids';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { DEFAULT_AI_CONNECTOR } from '../../../common/constants';
import { UserAssetTableType } from '../../explore/users/store/model';

/**
 * Panel to be displayed in the document details expandable flyout right section
 */
export const AIForSOCPanel: React.FC<Partial<AIForSOCDetailsProps>> = memo(() => {
  const { eventId, getFieldsData, indexName, dataFormattedForFieldBrowser } =
    useAIForSOCDetailsContext();

  const getPromptContext = useCallback(
    async () => getRawData(dataFormattedForFieldBrowser ?? []),
    [dataFormattedForFieldBrowser]
  );
  const promptContext: PromptContext = {
    category: 'alert',
    description: 'Alert summary',
    getPromptContext,
    id: '_promptContextId',
    suggestedUserPrompt: '_suggestedUserPrompt',
    tooltip: '_tooltip',
  };

  const ruleName = useMemo(
    () => getField(getFieldsData('kibana.alert.rule.name')) || '',
    [getFieldsData]
  );
  const { uiSettings } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  // TODO will this be in non-serverless? because this value will not work if so
  const defaultConnectorId = uiSettings.get<string>(DEFAULT_AI_CONNECTOR);
  const timestamp = useMemo(() => getField(getFieldsData('@timestamp')) || '', [getFieldsData]);

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <FlyoutHeader>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon
              color={'text'}
              type={'warning'}
              css={css`
                margin: ${euiTheme.size.xs} 0;
              `}
              data-test-subj={`aiForSocTitleIcon`}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s" data-test-subj={`aiForSocTitleText`}>
              <h3>{ruleName}</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </FlyoutHeader>
      <FlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <AlertSummary
              alertId={eventId}
              defaultConnectorId={defaultConnectorId}
              isContextReady={(dataFormattedForFieldBrowser ?? []).length > 0}
              promptContext={promptContext}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <DocumentDetailsProvider
              id={eventId}
              indexName={indexName}
              scopeId={UserAssetTableType.assetOkta}
            >
              <HighlightedFields />
            </DocumentDetailsProvider>
          </EuiFlexItem>
          <EuiFlexItem>
            <AttackDiscoveryWidget id={eventId} />
          </EuiFlexItem>
          <EuiFlexItem>
            <Conversations id={eventId} />
          </EuiFlexItem>
          <EuiFlexItem>
            <SuggestedPrompts
              getPromptContext={getPromptContext}
              ruleName={ruleName}
              timestamp={timestamp}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </FlyoutBody>
      <PanelFooter />
    </>
  );
});
AIForSOCPanel.displayName = 'AIForSOCPanel';
