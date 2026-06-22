/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/latest';
import { GRAPH_INFERRED_KI_BADGE_ID } from '../test_ids';

const INFERRED_KI_LABEL = i18n.translate(
  'securitySolutionPackages.csp.graph.inferredKnowledgeIndicator.label',
  {
    defaultMessage: 'Inferred (KI)',
  }
);

const INFERRED_KI_TOOLTIP = i18n.translate(
  'securitySolutionPackages.csp.graph.inferredKnowledgeIndicator.tooltip',
  {
    defaultMessage:
      'This actor, target, or action was derived from a non-ECS field by a Streams Knowledge Indicator alias rather than read directly from a canonical ECS field.',
  }
);

/**
 * True when at least one of the node's underlying documents carries
 * Streams-Knowledge-Indicators provenance (i.e. an inferred, non-ECS alias
 * filled one of its actor / target / action slots). Drives the "Inferred (KI)"
 * badge. ECS-native documents never carry this object, so the badge stays off
 * for them.
 */
export const hasKnowledgeIndicatorProvenance = (documentsData?: NodeDocumentDataModel[]): boolean =>
  Array.isArray(documentsData) &&
  documentsData.some((doc) => doc?.knowledge_indicator?.feature_uuid != null);

export interface InferredKnowledgeIndicatorBadgeProps {
  /** Optional override for the badge label; defaults to "Inferred (KI)". */
  label?: string;
}

export const InferredKnowledgeIndicatorBadge = ({
  label = INFERRED_KI_LABEL,
}: InferredKnowledgeIndicatorBadgeProps) => (
  <EuiToolTip content={INFERRED_KI_TOOLTIP} position="top">
    <EuiBadge
      data-test-subj={GRAPH_INFERRED_KI_BADGE_ID}
      color="hollow"
      iconType="inspect"
      aria-label={INFERRED_KI_TOOLTIP}
    >
      {label}
    </EuiBadge>
  </EuiToolTip>
);
