/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSkeletonText,
  EuiSkeletonLoading,
  EuiSkeletonTitle,
  EuiCodeBlock,
} from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { TechnicalPreviewBadge } from '../../../../common/components/technical_preview_badge';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { useRuleHealth } from '../../../rule_monitoring/logic/detection_engine_health/use_rule_health';

export const DetectionEngineRuleHealthPage = memo(
  function DetectionEngineRuleHealthPage(): JSX.Element {
    const { ruleId: id } = useParams<{
      ruleId: string;
    }>();
    const ruleHealth = useRuleHealth({ rule_id: id });
    const isLoading = ruleHealth.isLoading || ruleHealth.isFetching;

    const skeleton = useMemo(
      () => (
        <>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="m" />
              <EuiTitle size="s">
                <h3>{'Detection Engine Health'}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiSkeletonText lines={2} />
              <EuiSpacer size="m" />
              <EuiSkeletonText lines={4} />
              <EuiSpacer size="m" />
              <EuiSkeletonText lines={3} />
              <EuiSpacer size="m" />
              <EuiSkeletonLoading
                isLoading
                loadingContent={
                  <>
                    <EuiSkeletonTitle />
                    <EuiSkeletonText />
                  </>
                }
                loadedContent={null}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
      []
    );
    const data = useMemo(
      () => (
        <>
          <EuiCodeBlock language="json" fontSize="m" paddingSize="m">
            {JSON.stringify(ruleHealth.data, null, 2)}
          </EuiCodeBlock>
        </>
      ),
      [ruleHealth.data]
    );

    return (
      <>
        <SecuritySolutionPageWrapper>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>
                  {`Detection Engine Rule Health (${id})`} <TechnicalPreviewBadge label="" />
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              {isLoading ? skeleton : data}{' '}
            </EuiFlexItem>
          </EuiFlexGroup>
        </SecuritySolutionPageWrapper>

        <SpyRoute pageName={SecurityPageName.ruleHealth} />
      </>
    );
  }
);
