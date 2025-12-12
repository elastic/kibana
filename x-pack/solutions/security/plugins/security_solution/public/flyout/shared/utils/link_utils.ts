/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FlyoutPanelProps } from '@kbn/flyout';
import { TableId } from '@kbn/securitysolution-data-table';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { getEcsField } from '../../document_details/right/components/table_field_name_cell';
import {
  HOST_NAME_FIELD_NAME,
  IP_FIELD_TYPE,
  SIGNAL_RULE_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { HostPanelKey, UserPanelKey } from '../../entity_details/shared/constants';
import { HostPreviewPanelKey } from '../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from '../../document_details/right/components/host_entity_overview';
import { UserPreviewPanelKey } from '../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from '../../document_details/right/components/user_entity_overview';
import {
  NETWORK_PREVIEW_BANNER,
  NetworkPanelKey,
  NetworkPreviewPanelKey,
} from '../../network_details';
import { RULE_PREVIEW_BANNER, RulePanelKey, RulePreviewPanelKey } from '../../rule_details/right';
import { DocumentDetailsPreviewPanelKey } from '../../document_details/shared/constants/panel_keys';
import { EVENT_PREVIEW_BANNER } from '../../document_details/preview/constants';
import { EVENT_SOURCE_FIELD_DESCRIPTOR } from '../../../common/components/event_details/translations';

// Helper function to check if the field has a flyout link
export const isFlyoutLink = ({
  field,
  ruleId,
  scopeId,
}: {
  field: string;
  ruleId?: string;
  scopeId: string;
}) => {
  // don't show link for rule name if rule id is not provided or if isRulePreview is true
  if (field === SIGNAL_RULE_NAME_FIELD_NAME) {
    return !!ruleId && scopeId !== TableId.rulePreview;
  }
  return FLYOUT_FIELDS.includes(field) || getEcsField(field)?.type === IP_FIELD_TYPE;
};

interface GetFlyoutParams {
  value: string;
  field: string;
  scopeId: string;
  ruleId?: string;
  ancestorsIndexName?: string;
}

const FLYOUT_FIELDS = [
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  EVENT_SOURCE_FIELD_DESCRIPTOR,
];

// Helper get function to get flyout parameters based on field name and isFlyoutOpen
// If flyout is currently open, preview panel params are returned
// If flyout is not currently open, flyout rightpanel params are returned
export const getMainPanelParams = ({
  value,
  field,
  scopeId,
  ruleId,
}: GetFlyoutParams): FlyoutPanelProps | null => {
  if (!isFlyoutLink({ field, ruleId, scopeId })) {
    return null;
  }

  if (getEcsField(field)?.type === IP_FIELD_TYPE) {
    return {
      id: NetworkPanelKey,
      params: {
        ip: value,
        scopeId,
        flowTarget: field.includes(FlowTargetSourceDest.destination)
          ? FlowTargetSourceDest.destination
          : FlowTargetSourceDest.source,
        isChild: false,
      },
    };
  }

  switch (field) {
    case HOST_NAME_FIELD_NAME:
      return {
        id: HostPanelKey,
        params: {
          hostName: value,
          scopeId,
          isChild: false,
        },
      };
    case USER_NAME_FIELD_NAME:
      return {
        id: UserPanelKey,
        params: {
          userName: value,
          scopeId,
          isChild: false,
        },
      };
    case SIGNAL_RULE_NAME_FIELD_NAME:
      return {
        id: RulePanelKey,
        params: {
          ruleId,
          isChild: false,
        },
      };
    default:
      return null;
  }
};

export const getChildPanelParams = ({
  value,
  field,
  scopeId,
  ruleId,
  ancestorsIndexName,
}: GetFlyoutParams): FlyoutPanelProps | null => {
  if (!isFlyoutLink({ field, ruleId, scopeId })) {
    return null;
  }

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
        isChild: true,
      },
    };
  }

  switch (field) {
    case HOST_NAME_FIELD_NAME:
      return {
        id: HostPreviewPanelKey,
        params: {
          hostName: value,
          scopeId,
          banner: HOST_PREVIEW_BANNER,
          isChild: true,
        },
      };
    case USER_NAME_FIELD_NAME:
      return {
        id: UserPreviewPanelKey,
        params: {
          userName: value,
          scopeId,
          banner: USER_PREVIEW_BANNER,
          isChild: true,
        },
      };
    case SIGNAL_RULE_NAME_FIELD_NAME:
      return {
        id: RulePreviewPanelKey,
        params: {
          ruleId,
          banner: RULE_PREVIEW_BANNER,
          isPreviewMode: true,
          isChild: true,
        },
      };
    case EVENT_SOURCE_FIELD_DESCRIPTOR:
      return {
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id: value,
          scopeId,
          indexName: ancestorsIndexName,
          banner: EVENT_PREVIEW_BANNER,
          isChild: true,
        },
      };
    default:
      return null;
  }
};
