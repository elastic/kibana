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
} from '@elastic/eui';
import React, { memo } from 'react';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';

export const DetectionEngineSpaceRulesHealthPage = memo(
  function DetectionEngineSpaceRulesHealthPage(): JSX.Element {
    return (
      <>
        <SecuritySolutionPageWrapper>
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
        </SecuritySolutionPageWrapper>

        <SpyRoute pageName={SecurityPageName.spaceRulesHealth} />
      </>
    );
  }
);
