/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectableOption,
  EuiText,
  EuiTextColor,
  EuiTextTruncate,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';

import { MlModel } from '../../../../../../../common/types/ml';
import { TrainedModelHealth } from '../ml_model_health';

import { LicenseBadge } from './license_badge';

export const ModelSelectOption: React.FC<EuiSelectableOption<MlModel>> = ({
  modelId,
  title,
  description,
  isPlaceholder,
  licenseType,
  deploymentState,
  deploymentStateReason,
}) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize={useIsWithinMaxBreakpoint('s') ? 'xs' : 'l'}>
      <EuiFlexItem style={{ overflow: 'hidden' }}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>
                <EuiTextTruncate text={title} />
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTextColor color="subdued">
              <EuiTextTruncate text={modelId} />
            </EuiTextColor>
          </EuiFlexItem>
          {(licenseType || description) && (
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                {licenseType && (
                  <EuiFlexItem grow={false}>
                    {/* Wrap in a span to prevent the badge from growing to a whole row on mobile */}
                    <span>
                      <LicenseBadge licenseType={licenseType} />
                    </span>
                  </EuiFlexItem>
                )}
                {description && (
                  <EuiFlexItem style={{ overflow: 'hidden' }}>
                    <EuiText size="xs">
                      <EuiTextTruncate text={description} />
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
        {/* Wrap in a span to prevent the badge from growing to a whole row on mobile */}
        <span>
          <TrainedModelHealth
            modelState={deploymentState}
            modelStateReason={deploymentStateReason}
            isDownloadable={isPlaceholder}
          />
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
