/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useController } from 'react-hook-form';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';

import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';
import { PlaygroundBodySection } from '../playground_body_section';
import { ElasticsearchQueryViewer } from './query_viewer';
import { ElasticsearchQueryOutput } from './query_output';
import { QuerySidePanel } from './query_side_panel';
import { useElasticsearchQuery } from '../../hooks/use_elasticsearch_query';
import { ChatForm, ChatFormFields, PlaygroundPageMode } from '../../types';
import { FullHeight, QueryViewContainer, QueryViewSidebarContainer } from './styles';
import { disableExecuteQuery } from '../../utils/user_query';

export const SearchQueryMode = ({ pageMode }: { pageMode: PlaygroundPageMode }) => {
  const { euiTheme } = useEuiTheme();
  const usageTracker = useUsageTracker();
  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.queryModeLoaded);
  }, [usageTracker]);
  const { executeQuery, data, error, isError, fetchStatus } = useElasticsearchQuery(pageMode);
  const {
    field: { value: userElasticsearchQueryValidations },
  } = useController<ChatForm, ChatFormFields.userElasticsearchQueryValidations>({
    name: ChatFormFields.userElasticsearchQueryValidations,
  });
  const executeQueryDisabled = disableExecuteQuery(userElasticsearchQueryValidations);
  const isLoading = fetchStatus !== 'idle';

  return (
    <PlaygroundBodySection
      color={euiTheme.colors.backgroundBasePlain}
      dataTestSubj="queryModeSection"
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={6} css={QueryViewContainer(euiTheme)}>
          <EuiPanel
            paddingSize="none"
            hasShadow={false}
            css={css({
              // This is needed to maintain the resizable container height when rendering output editor with larger content
              height: '95%',
            })}
          >
            <EuiResizableContainer direction="vertical" css={FullHeight}>
              {(EuiResizablePanel, EuiResizableButton) => (
                <>
                  <EuiResizablePanel initialSize={60} minSize="20%" tabIndex={0} paddingSize="none">
                    <ElasticsearchQueryViewer
                      executeQuery={executeQuery}
                      executeQueryDisabled={executeQueryDisabled}
                      isLoading={isLoading}
                    />
                  </EuiResizablePanel>
                  <EuiResizableButton accountForScrollbars="both" />
                  <EuiResizablePanel initialSize={40} minSize="25%" tabIndex={0} paddingSize="none">
                    <ElasticsearchQueryOutput
                      queryResponse={data}
                      queryError={error}
                      isError={isError}
                      isLoading={isLoading}
                    />
                  </EuiResizablePanel>
                </>
              )}
            </EuiResizableContainer>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={3} className="eui-yScroll" css={QueryViewSidebarContainer(euiTheme)}>
          <QuerySidePanel
            pageMode={pageMode}
            executeQuery={executeQuery}
            executeQueryDisabled={executeQueryDisabled}
            isLoading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </PlaygroundBodySection>
  );
};
