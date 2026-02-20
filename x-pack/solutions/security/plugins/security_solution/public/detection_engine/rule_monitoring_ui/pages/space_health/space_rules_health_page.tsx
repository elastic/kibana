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
import { TechnicalPreviewBadge } from '../../../../common/components/technical_preview_badge';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { useSpaceRulesHealth } from '../../../rule_monitoring/logic/detection_engine_health/use_space_rules_health';

export const DetectionEngineSpaceRulesHealthPage = memo(
  function DetectionEngineSpaceRulesHealthPage(): JSX.Element {
    const spaceRulesHealth = useSpaceRulesHealth({});
    const isLoading = spaceRulesHealth.isLoading || spaceRulesHealth.isFetching;

    const skeleton = useMemo(
      () => (
        <>
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
        </>
      ),
      []
    );
    const data = useMemo(
      () => (
        <>
          <EuiCodeBlock language="json" fontSize="m" paddingSize="m">
            {JSON.stringify(spaceRulesHealth.data, null, 2)}
          </EuiCodeBlock>
        </>
      ),
      [spaceRulesHealth.data]
    );

    return (
      <>
        <SecuritySolutionPageWrapper>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>
                  {'Detection Engine Space Rules Health'} <TechnicalPreviewBadge label="" />
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              {isLoading ? skeleton : data}
            </EuiFlexItem>
          </EuiFlexGroup>
        </SecuritySolutionPageWrapper>

        <SpyRoute pageName={SecurityPageName.spaceRulesHealth} />
      </>
    );
  }
);
