/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';
import type { DocumentAnalysis } from './analyze_documents';
import type { NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/latest';

const tooltipTitle = i18n.translate(
  'securitySolutionPackages.csp.graph.labelNode.tooltip.title',
  {
    defaultMessage: 'Performed action',
  }
);

const TooltipBadge = styled.div<{ isAlert: boolean; euiTheme: any }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 20px;
  padding: 2px 6px;
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.small};
  margin-left: 6px;
  
  ${({ isAlert, euiTheme }) => 
    isAlert 
      ? `
          background-color: ${euiTheme.colors.danger};
          color: ${euiTheme.colors.backgroundBasePlain};
        `
      : `
          background-color: ${euiTheme.colors.backgroundBasePlain};
          color: ${euiTheme.colors.textPrimary};
          border: 1px solid ${euiTheme.colors.borderBasePlain};
        `
  }
`;

interface DocumentGroup {
  type: 'event' | 'alert';
  count: number;
  documents: NodeDocumentDataModel[];
}

interface LabelNodeTooltipProps {
  analysis: DocumentAnalysis;
}

export const LabelNodeTooltipContent = ({ analysis }: LabelNodeTooltipProps) => {
  const { euiTheme } = useEuiTheme();
  
  const documentGroups = useMemo(() => {
    const groups: DocumentGroup[] = [];
    
    // Group documents by type and count frequency
    const eventCountMap = new Map<string, number>();
    const alertCountMap = new Map<string, number>();
    
    analysis.eventDocuments.forEach(doc => {
      eventCountMap.set(doc.id, (eventCountMap.get(doc.id) || 0) + 1);
    });
    
    analysis.alertDocuments.forEach(doc => {
      alertCountMap.set(doc.id, (alertCountMap.get(doc.id) || 0) + 1);
    });
    
    if (analysis.totalEvents > 0) {
      groups.push({
        type: 'event',
        count: analysis.totalEvents,
        documents: analysis.eventDocuments,
      });
    }
    
    if (analysis.totalAlerts > 0) {
      groups.push({  
        type: 'alert',
        count: analysis.totalAlerts,
        documents: analysis.alertDocuments,
      });
    }
    
    return groups;
  }, [analysis]);

  const renderDocumentGroup = (group: DocumentGroup) => {
    const isAlert = group.type === 'alert';
    const label = isAlert ? 'Alerted events' : 'Default events';
    
    return (
      <EuiFlexGroup key={group.type} gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {isAlert && (
            <EuiIcon 
              type="warningFilled" 
              color="danger" 
              size="s"
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText size="s" color="default">
            {label}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {group.count > 99 && (
            <TooltipBadge isAlert={isAlert} euiTheme={euiTheme}>
              <EuiText 
                size="xs" 
                css={css`
                  font-weight: ${euiTheme.font.weight.bold};
                `}
              >
                {isAlert && (
                  <EuiIcon 
                    type="warningFilled" 
                    color="backgroundBasePlain" 
                    size="xs"
                    css={css`
                      margin-right: 2px;
                    `} 
                  />
                )}
                +99
              </EuiText>
            </TooltipBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <div data-test-subj="label-node-tooltip-content">
      <EuiText size="s" css={css`font-weight: ${euiTheme.font.weight.bold}; margin-bottom: ${euiTheme.size.xs};`}>
        {tooltipTitle}
      </EuiText>
      {documentGroups.map(renderDocumentGroup)}
    </div>
  );
};