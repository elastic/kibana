/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiBadge,
  useEuiTheme,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import coverage_illustration from '../assets/coverage_illustration.svg';
import quality_illustration from '../assets/quality_illustration.svg';
import continuity_illustration from '../assets/continuity_illustration.svg';
import retention_illustration from '../assets/retention_illustration.svg';

export type VisibilityTabId = 'coverage' | 'quality' | 'continuity' | 'retention';
export type VisibilityStatus = 'healthy' | 'actionsRequired' | 'noData';

interface VisibilityBox {
  id: VisibilityTabId;
  title: string;
  status: VisibilityStatus; // For now, random status - will be computed later
  illustration: string;
  statusDescriptions: {
    healthy: string;
    actionsRequired: string;
    noData: string;
  };
}

interface VisibilitySectionBoxesProps {
  selectedTabId: VisibilityTabId;
  onTabSelect: (tabId: VisibilityTabId) => void;
}

const VISIBILITY_BOXES: VisibilityBox[] = [
  {
    id: 'coverage',
    title: i18n.translate('xpack.securitySolution.siemReadiness.visibility.coverage.title', {
      defaultMessage: 'Coverage',
    }),
    status: 'actionsRequired', // Random for now
    illustration: coverage_illustration,
    statusDescriptions: {
      healthy: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.coverage.healthy.description',
        { defaultMessage: 'All enabled rules have required integrations.' }
      ),
      actionsRequired: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.coverage.actionsRequired.description',
        { defaultMessage: 'Integrations required for some enabled rules.' }
      ),
      noData: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.coverage.noData.description',
        { defaultMessage: 'You have not installed and enabled any rules yet.' }
      ),
    },
  },
  {
    id: 'quality',
    title: i18n.translate('xpack.securitySolution.siemReadiness.visibility.quality.title', {
      defaultMessage: 'Quality',
    }),
    status: 'healthy', // Random for now
    illustration: quality_illustration,
    statusDescriptions: {
      healthy: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.quality.healthy.description',
        { defaultMessage: 'ECS Compatibility is healthy.' }
      ),
      actionsRequired: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.quality.actionsRequired.description',
        { defaultMessage: 'ECS Incompatibility Detected.' }
      ),
      noData: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.quality.noData.description',
        { defaultMessage: 'No data to check yet.' }
      ),
    },
  },
  {
    id: 'continuity',
    title: i18n.translate('xpack.securitySolution.siemReadiness.visibility.continuity.title', {
      defaultMessage: 'Continuity',
    }),
    status: 'noData', // Random for now
    illustration: continuity_illustration,
    statusDescriptions: {
      healthy: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.continuity.healthy.description',
        { defaultMessage: 'Ingest pipeline is healthy.' }
      ),
      actionsRequired: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.continuity.actionsRequired.description',
        { defaultMessage: 'Ingest pipeline failures occurred.' }
      ),
      noData: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.continuity.noData.description',
        { defaultMessage: 'No data currently being ingested.' }
      ),
    },
  },
  {
    id: 'retention',
    title: i18n.translate('xpack.securitySolution.siemReadiness.visibility.retention.title', {
      defaultMessage: 'Retention',
    }),
    status: 'actionsRequired', // Random for now
    illustration: retention_illustration,
    statusDescriptions: {
      healthy: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.retention.healthy.description',
        { defaultMessage: 'All ILM policies meet requirements.' }
      ),
      actionsRequired: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.retention.actionsRequired.description',
        { defaultMessage: 'Some ILM policies needs increasing.' }
      ),
      noData: i18n.translate(
        'xpack.securitySolution.siemReadiness.visibility.retention.noData.description',
        { defaultMessage: 'No data in ILM management.' }
      ),
    },
  },
];

const getBadge = (status: VisibilityStatus): { label: string; color: string; icon: string } => {
  switch (status) {
    case 'healthy':
      return {
        label: i18n.translate('xpack.securitySolution.siemReadiness.visibility.badge.healthy', {
          defaultMessage: 'Healthy',
        }),
        color: 'success',
        icon: 'check',
      };
    case 'actionsRequired':
      return {
        label: i18n.translate(
          'xpack.securitySolution.siemReadiness.visibility.badge.actionsRequired',
          {
            defaultMessage: 'Actions required',
          }
        ),
        color: 'warning',
        icon: 'warning',
      };
    case 'noData':
      return {
        label: i18n.translate('xpack.securitySolution.siemReadiness.visibility.badge.noData', {
          defaultMessage: 'No data',
        }),
        color: 'default',
        icon: 'iInCircle',
      };
    default:
      return {
        label: '',
        color: 'default',
        icon: 'iInCircle',
      };
  }
};

export const VisibilitySectionBoxes: React.FC<VisibilitySectionBoxesProps> = ({
  selectedTabId,
  onTabSelect,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="m">
      {VISIBILITY_BOXES.map((box) => {
        const isSelected = selectedTabId === box.id;
        const badge = getBadge(box.status);
        const currentDescription = box.statusDescriptions[box.status];

        return (
          <EuiFlexItem key={box.id}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="m"
              style={{
                minHeight: '120px',
                border: isSelected ? `1px solid ${euiTheme.colors.primary}` : undefined,
                backgroundColor: isSelected ? euiTheme.colors.lightestShade : undefined,
              }}
              onClick={() => onTabSelect(box.id)}
            >
              <EuiFlexGroup direction="column" gutterSize="none" style={{ height: '100%', gap: 5 }}>
                {/* Top section - 20% height - Title and Badge */}
                <EuiFlexItem grow={false} style={{ flexBasis: '20%' }}>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                    <EuiFlexItem>
                      <EuiTitle size="xs">
                        <h3 style={{ color: euiTheme.colors.primary }}>{box.title}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={badge.color}>{badge.label}</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                {/* Bottom section - 80% height - Description and Illustration */}
                <EuiFlexItem style={{ flexBasis: '80%' }}>
                  <EuiFlexGroup gutterSize="s" alignItems="flexStart">
                    <EuiFlexItem>
                      <EuiText size="s" color="subdued">
                        {currentDescription}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem
                      grow={false}
                      style={{ width: '50px', height: '50px', alignSelf: 'end' }}
                    >
                      <EuiIcon type={box.illustration} css={{ width: '100%', height: '100%' }} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

VisibilitySectionBoxes.displayName = 'VisibilitySectionBoxes';
