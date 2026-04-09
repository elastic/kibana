/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { HuntingLead, Observation } from './types';
import { getModuleLabel } from './translations';
import * as i18n from './translations';
import { getEntityIcon } from './utils';
import { useRiskSeverityColors } from '../../../../common/utils/risk_color_palette';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';

interface LeadProvenanceFlyoutProps {
  lead: HuntingLead;
  onClose: () => void;
  onInvestigateInChat?: (lead: HuntingLead) => void;
  onDismiss?: (lead: HuntingLead) => void;
}

export const LeadProvenanceFlyout: React.FC<LeadProvenanceFlyoutProps> = ({
  lead,
  onClose,
  onInvestigateInChat,
  onDismiss,
}) => {
  const severityColors = useRiskSeverityColors();

  const observationsByModule = useMemo(() => {
    const grouped: Record<string, Observation[]> = {};
    for (const obs of lead.observations) {
      if (!grouped[obs.moduleId]) {
        grouped[obs.moduleId] = [];
      }
      grouped[obs.moduleId].push(obs);
    }
    return grouped;
  }, [lead.observations]);

  const handleInvestigate = useCallback(
    () => onInvestigateInChat?.(lead),
    [onInvestigateInChat, lead]
  );
  const handleDismiss = useCallback(() => onDismiss?.(lead), [onDismiss, lead]);

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      size="m"
      ownFocus
      aria-label={i18n.LEAD_PROVENANCE_TITLE}
      data-test-subj="leadProvenanceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{lead.title}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          {lead.byline}
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <PreferenceFormattedDate value={new Date(lead.timestamp)} />
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Description */}
        <EuiTitle size="xs">
          <h3>{i18n.DESCRIPTION_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <ul>
            {lead.description
              .split('\n')
              .filter(Boolean)
              .map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
          </ul>
        </EuiText>

        <EuiSpacer size="l" />

        {/* Entities */}
        <EuiTitle size="xs">
          <h3>{i18n.ENTITIES_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" wrap responsive={false}>
          {lead.entities.map((entity) => (
            <EuiFlexItem grow={false} key={`${entity.type}-${entity.name}`}>
              <EuiBadge color="hollow">
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="xs"
                  responsive={false}
                  component="span"
                >
                  <EuiIcon type={getEntityIcon(entity.type)} size="s" aria-hidden={true} />
                  <span>{entity.name}</span>
                </EuiFlexGroup>
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {/* Observations grouped by module */}
        <EuiTitle size="xs">
          <h3>{i18n.OBSERVATIONS_SECTION}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {Object.entries(observationsByModule).map(([moduleId, observations]) => (
          <React.Fragment key={moduleId}>
            <EuiText size="xs" color="subdued">
              <strong>{getModuleLabel(moduleId)}</strong>
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup direction="column" gutterSize="xs">
              {observations.map((obs, idx) => (
                <EuiFlexItem key={`${moduleId}-${obs.type}-${idx}`}>
                  <EuiPanel hasBorder paddingSize="s" data-test-subj={`observation-${obs.type}`}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color={severityColors[obs.severity as Severity] ?? severityColors.medium}
                        >
                          {obs.severity}
                        </EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <strong>{obs.type}</strong>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiText size="xs" color="subdued">
                      {obs.description}
                    </EuiText>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </React.Fragment>
        ))}

        {/* Tags */}
        {lead.tags.length > 0 && (
          <>
            <EuiTitle size="xs">
              <h3>{i18n.TAGS_SECTION}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {lead.tags.map((tag) => (
                <EuiFlexItem grow={false} key={tag}>
                  <EuiBadge color="default">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        {/* Chat Recommendations */}
        {lead.chatRecommendations.length > 0 && (
          <>
            <EuiTitle size="xs">
              <h3>{i18n.CHAT_RECOMMENDATIONS_SECTION}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiListGroup flush maxWidth={false}>
              {lead.chatRecommendations.map((rec, idx) => (
                <EuiListGroupItem
                  key={idx}
                  label={rec}
                  iconType="discuss"
                  size="s"
                  wrapText
                  data-test-subj={`chatRecommendation-${idx}`}
                />
              ))}
            </EuiListGroup>
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {onInvestigateInChat && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    iconType="discuss"
                    onClick={handleInvestigate}
                    size="s"
                    data-test-subj="investigateInChatButton"
                  >
                    {i18n.INVESTIGATE_IN_CHAT}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {onDismiss && lead.status === 'active' && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={handleDismiss}
                    size="s"
                    color="danger"
                    data-test-subj="dismissLeadButton"
                  >
                    {i18n.DISMISS}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} size="s" data-test-subj="closeProvenanceFlyout">
              {i18n.CLOSE}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
};
