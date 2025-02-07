/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { getEcsField } from '../../document_details/right/components/table_field_name_cell';
import {
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  IP_FIELD_TYPE,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { useKibana } from '../../../common/lib/kibana';
import { FLYOUT_PREVIEW_LINK_TEST_ID } from './test_ids';
import { HostPreviewPanelKey } from '../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from '../../document_details/right/components/host_entity_overview';
import { UserPreviewPanelKey } from '../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from '../../document_details/right/components/user_entity_overview';
import { NetworkPreviewPanelKey, NETWORK_PREVIEW_BANNER } from '../../network_details';
import { RulePreviewPanelKey, RULE_PREVIEW_BANNER } from '../../rule_details/right';
import { DocumentEventTypes } from '../../../common/lib/telemetry';

const PREVIEW_FIELDS = [HOST_NAME_FIELD_NAME, USER_NAME_FIELD_NAME, SIGNAL_RULE_NAME_FIELD_NAME];

// Helper function to check if the field has a preview link
export const hasPreview = (field: string) =>
  PREVIEW_FIELDS.includes(field) || getEcsField(field)?.type === IP_FIELD_TYPE;

interface PreviewParams {
  id: string;
  params: Record<string, unknown>;
}

// Helper get function to get the preview parameters
const getPreviewParams = (
  value: string,
  field: string,
  scopeId: string,
  ruleId?: string
): PreviewParams | null => {
  if (getEcsField(field)?.type === IP_FIELD_TYPE) {
    return {
      id: NetworkPreviewPanelKey,
      params: {
        ip: value,
        scopeId,
        flowTarget: field.includes(FlowTargetSourceDest.destination)
          ? FlowTargetSourceDest.destination
          : FlowTargetSourceDest.source,
        banner: NETWORK_PREVIEW_BANNER,
      },
    };
  }
  if (field === SIGNAL_RULE_NAME_FIELD_NAME && !ruleId) {
    return null;
  }
  switch (field) {
    case HOST_NAME_FIELD_NAME:
      return {
        id: HostPreviewPanelKey,
        params: { hostName: value, scopeId, banner: HOST_PREVIEW_BANNER },
      };
    case USER_NAME_FIELD_NAME:
      return {
        id: UserPreviewPanelKey,
        params: { userName: value, scopeId, banner: USER_PREVIEW_BANNER },
      };
    case SIGNAL_RULE_NAME_FIELD_NAME:
      return {
        id: RulePreviewPanelKey,
        params: { ruleId, banner: RULE_PREVIEW_BANNER, isPreviewMode: true },
      };
    default:
      return null;
  }
};

interface PreviewLinkProps {
  /**
   * Highlighted field's field name
   */
  field: string;
  /**
   * Highlighted field's value to display as a EuiLink to open the expandable left panel
   * (used for host name and username fields)
   */
  value: string;
  /**
   * Scope id to use for the preview panel
   */
  scopeId: string;
  /**
   * Rule id to use for the preview panel
   */
  ruleId?: string;
  /**
   * Whether the preview link is in preview mode
   */
  isPreview?: boolean;
  /**
   * Optional data-test-subj value
   */
  ['data-test-subj']?: string;
  /**
   * React components to render, if none provided, the value will be rendered
   */
  children?: React.ReactNode;
}

/**
 * Renders a preview link for entities and ip addresses
 */
export const PreviewLink: FC<PreviewLinkProps> = ({
  field,
  value,
  scopeId,
  ruleId,
  isPreview,
  children,
  'data-test-subj': dataTestSubj = FLYOUT_PREVIEW_LINK_TEST_ID,
}) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const { telemetry } = useKibana().services;

  const onClick = useCallback(() => {
    const previewParams = getPreviewParams(value, field, scopeId, ruleId);
    if (previewParams) {
      openPreviewPanel({
        id: previewParams.id,
        params: previewParams.params,
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'preview',
      });
    }
  }, [field, scopeId, value, telemetry, openPreviewPanel, ruleId]);

  // If the field is not previewable, do not render link
  if (!hasPreview(field)) {
    return <>{children ?? value}</>;
  }

  // If the field is rule.id, and the ruleId is not provided or currently in rule preview, do not render link
  if (field === SIGNAL_RULE_NAME_FIELD_NAME && (!ruleId || isPreview)) {
    return <>{children ?? value}</>;
  }

  return (
    <EuiLink onClick={onClick} data-test-subj={dataTestSubj}>
      {children ?? value}
    </EuiLink>
  );
};
