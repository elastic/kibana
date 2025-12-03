/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton, EuiFlexGroup, EuiPageTemplate } from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';
import { useGetLinkTo } from './use_policy_artifacts_empty_hooks';
import type { POLICY_ARTIFACT_EMPTY_UNEXISTING_LABELS } from './translations';
import type { ArtifactListPageUrlParams } from '../../../../../components/artifact_list_page';

interface CommonProps {
  policyId: string;
  policyName: string;
  labels: typeof POLICY_ARTIFACT_EMPTY_UNEXISTING_LABELS;
  canWriteArtifact?: boolean;
  getPolicyArtifactsPath: (policyId: string) => string;
  getArtifactPath: (location?: Partial<ArtifactListPageUrlParams>) => string;
}

export const PolicyArtifactsEmptyUnexisting = memo<CommonProps>(
  ({
    policyId,
    policyName,
    labels,
    canWriteArtifact = false,
    getPolicyArtifactsPath,
    getArtifactPath,
  }) => {
    const isEndpointArtifactsExportImportEnabled = useIsExperimentalFeatureEnabled(
      'endpointArtifactsExportImportEnabled'
    );

    const { onClickHandler: onAddClickHandler, toRouteUrl: toAddRouteUrl } = useGetLinkTo(
      policyId,
      policyName,
      getPolicyArtifactsPath,
      getArtifactPath,
      {
        show: 'create',
      }
    );

    const { onClickHandler: onImportClickHandler, toRouteUrl: toImportRouteUrl } = useGetLinkTo(
      policyId,
      policyName,
      getPolicyArtifactsPath,
      getArtifactPath,
      {
        show: 'import',
      }
    );

    return (
      <EuiPageTemplate.EmptyPrompt
        color="subdued"
        iconType="plusInCircle"
        data-test-subj="policy-artifacts-empty-unexisting"
        title={<h2>{labels.emptyUnexistingTitle}</h2>}
        body={labels.emptyUnexistingMessage}
        actions={
          canWriteArtifact ? (
            <EuiFlexGroup justifyContent="center">
              {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
              <EuiButton
                color="primary"
                fill
                onClick={onAddClickHandler}
                href={toAddRouteUrl}
                data-test-subj="unexisting-manage-artifacts-button"
              >
                {labels.emptyUnexistingPrimaryActionButtonTitle}
              </EuiButton>

              {isEndpointArtifactsExportImportEnabled && (
                // eslint-disable-next-line @elastic/eui/href-or-on-click
                <EuiButton
                  onClick={onImportClickHandler}
                  href={toImportRouteUrl}
                  data-test-subj="unexisting-manage-artifacts-import-button"
                >
                  {labels.emptyUnexistingImportButtonTitle}
                </EuiButton>
              )}
            </EuiFlexGroup>
          ) : null
        }
      />
    );
  }
);

PolicyArtifactsEmptyUnexisting.displayName = 'PolicyArtifactsEmptyUnexisting';
