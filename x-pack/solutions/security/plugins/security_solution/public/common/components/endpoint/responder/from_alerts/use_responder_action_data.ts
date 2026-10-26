/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { isNonLocalIndexName } from '@kbn/es-query';
import { useKibana } from '../../../../lib/kibana';
import { useAlertResponseActionsSupport } from '../../../../hooks/endpoint/use_alert_response_actions_support';
import type {
  EndpointCapabilities,
  ResponseActionAgentType,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import { useGetEndpointDetails, useWithShowResponder } from '../../../../../management/hooks';
import { HostStatus } from '../../../../../../common/endpoint/types';
import { getEventDetailsFieldValues } from '../../../../lib/endpoint/utils/get_event_details_field_values';
import {
  HOST_ENDPOINT_UNENROLLED_TOOLTIP,
  HOST_ON_LINKED_PROJECT_TOOLTIP,
  LOADING_ENDPOINT_DATA_TOOLTIP,
  METADATA_API_ERROR_TOOLTIP,
  NOT_FROM_ENDPOINT_HOST_TOOLTIP,
} from './translations';

export interface UseWithResponderActionDataFromAlertProps {
  eventData: TimelineEventsDetailsItem[] | null;
  onClick?: () => void;
}

export interface ResponderActionData {
  handleResponseActionsClick: () => void;
  isDisabled: boolean;
  tooltip: ReactNode;
}

/**
 * This hook is used to get the data needed to show the context menu items for the responder
 * actions using Alert data.
 *
 * NOTE:  If wanting to get teh same type of response but don't have Alert
 *        data, use `useResponderActionData()` instead
 *
 * @param onClick the callback to handle the click event
 * @param eventData the event data, exists only when agentType !== 'endpoint'
 * @returns an object with the data needed to show the context menu item
 */
export const useWithResponderActionDataFromAlert = ({
  eventData = [],
  onClick,
}: UseWithResponderActionDataFromAlertProps): ResponderActionData => {
  const {
    isSupported: hostSupportsResponseActions,
    unsupportedReason,
    details: { agentType, agentId, platform, hostName },
  } = useAlertResponseActionsSupport(eventData);

  const isEndpointHost = agentType === 'endpoint';

  // Only meaningful when CPS is on: `cpsManager` is present solely on CPS-enabled deployments. Off
  // CPS (including CCS deployments), an ancestor index can legitimately carry a remote-cluster prefix
  // that `isNonLocalIndexName` would flag, so the check must be gated to avoid a false positive.
  const isCpsEnabled = Boolean(useKibana().services.cps?.cpsManager);

  // In a Cross-Project Search deployment an alert can be generated off a document that lives in a
  // linked project even though the alert itself is stored locally. Response actions run origin-only
  // and reject such a host, so every command opened from the console would fail. Elasticsearch
  // prefixes the source `_index` with the project alias, so a non-local ancestor index is the signal
  // that the host belongs to a linked project.
  const isHostFromLinkedProject = useMemo<boolean>(
    () =>
      isCpsEnabled &&
      getEventDetailsFieldValues(
        { category: 'kibana', field: 'kibana.alert.ancestors.index' },
        eventData
      ).some(isNonLocalIndexName),
    [isCpsEnabled, eventData]
  );

  const endpointHostData = useResponderDataForEndpointHost(
    agentId,
    hostSupportsResponseActions && isEndpointHost
  );
  const showResponseActionsConsole = useWithShowResponder();

  const [isDisabled, tooltip]: [disabled: boolean, tooltip: ReactNode] = useMemo(() => {
    // Checked first so its reason wins: the metadata lookup that gates the endpoint path can fan out
    // under CPS and report the linked host as enrolled, which would otherwise leave this enabled.
    if (isHostFromLinkedProject) {
      return [true, HOST_ON_LINKED_PROJECT_TOOLTIP];
    }

    if (!hostSupportsResponseActions) {
      return [
        true,
        agentType && unsupportedReason ? unsupportedReason : NOT_FROM_ENDPOINT_HOST_TOOLTIP,
      ];
    }

    if (isEndpointHost) {
      return [endpointHostData.isDisabled, endpointHostData.tooltip];
    }

    return [false, undefined];
  }, [
    isHostFromLinkedProject,
    hostSupportsResponseActions,
    isEndpointHost,
    agentType,
    unsupportedReason,
    endpointHostData.isDisabled,
    endpointHostData.tooltip,
  ]);

  const handleResponseActionsClick = useCallback(() => {
    if (!isDisabled) {
      showResponseActionsConsole({
        agentId,
        agentType,
        hostName,
        platform,
        capabilities: isEndpointHost ? endpointHostData.capabilities : [],
      });

      if (onClick) {
        onClick();
      }
    }
  }, [
    isDisabled,
    showResponseActionsConsole,
    agentId,
    agentType,
    hostName,
    platform,
    isEndpointHost,
    endpointHostData.capabilities,
    onClick,
  ]);

  return {
    handleResponseActionsClick,
    isDisabled,
    tooltip,
  };
};

type ResponderDataForEndpointHost = Omit<ResponderActionData, 'handleResponseActionsClick'> & {
  capabilities: EndpointCapabilities[];
  hostName: string;
  platform: string;
};

/**
 * Hook to specifically for the responder data for Elastic Defend endpoints
 * @param endpointAgentId
 * @param enabled
 *
 * @internal
 */
const useResponderDataForEndpointHost = (
  endpointAgentId: string,
  enabled: boolean = true
): ResponderDataForEndpointHost => {
  const {
    data: endpointHostInfo,
    isFetching,
    error,
  } = useGetEndpointDetails(endpointAgentId, {
    enabled,
  });

  return useMemo<ResponderDataForEndpointHost>(() => {
    const response: ResponderDataForEndpointHost = {
      isDisabled: false,
      tooltip: undefined,
      capabilities: [],
      hostName: '',
      platform: '',
    };

    if (!enabled) {
      response.isDisabled = true;
      return response;
    }

    if (isFetching) {
      response.isDisabled = true;
      response.tooltip = LOADING_ENDPOINT_DATA_TOOLTIP;
      return response;
    }

    // if we got an error, and it's a 404, it means the endpoint is not from the endpoint host
    if (error && error.body?.statusCode === 404) {
      response.isDisabled = true;
      response.tooltip = NOT_FROM_ENDPOINT_HOST_TOOLTIP;
      return response;
    }

    // if we got an error and,
    // it's a 400 with unenrolled in the error message (alerts can exist for endpoint that are no longer around)
    // or,
    // the Host status is `unenrolled`
    if (
      (error && error.body?.statusCode === 400 && error.body?.message.includes('unenrolled')) ||
      endpointHostInfo?.host_status === HostStatus.UNENROLLED
    ) {
      response.isDisabled = true;
      response.tooltip = HOST_ENDPOINT_UNENROLLED_TOOLTIP;
      return response;
    }

    // return general error tooltip
    if (error) {
      response.isDisabled = true;
      response.tooltip = METADATA_API_ERROR_TOOLTIP;
    }

    response.capabilities = (endpointHostInfo?.metadata.Endpoint.capabilities ??
      []) as EndpointCapabilities[];
    response.hostName = endpointHostInfo?.metadata.host.name ?? '';
    response.platform = endpointHostInfo?.metadata.host.os.name.toLowerCase() ?? '';

    return response;
  }, [
    enabled,
    isFetching,
    error,
    endpointHostInfo?.host_status,
    endpointHostInfo?.metadata.Endpoint.capabilities,
    endpointHostInfo?.metadata.host.name,
    endpointHostInfo?.metadata.host.os.name,
  ]);
};

export interface UseResponderActionDataProps {
  agentId: string;
  agentType: ResponseActionAgentType;
  onClick?: () => void;
}

/**
 * Returns the data necessary to render a Responder action item (ex. menu item) when only the
 * `agentId` and `agentType` is available (ex. when showing the `Respond` button on the Host
 * details page of SIEM
 * @param onClick
 * @param agentId
 * @param agentType
 */
export const useResponderActionData = ({
  onClick,
  agentId,
  agentType,
}: UseResponderActionDataProps): ResponderActionData => {
  const isEndpointHost = agentType === 'endpoint';

  const showResponseActionsConsole = useWithShowResponder();
  const { tooltip, isDisabled, capabilities, hostName, platform } = useResponderDataForEndpointHost(
    agentId,
    isEndpointHost
  );

  // TODO:PT add support for other agent types once we add the `Respond` button to the Host details page in SIEM

  const handleResponseActionsClick = useCallback(() => {
    if (!isDisabled) {
      showResponseActionsConsole({
        agentId,
        agentType,
        hostName,
        platform,
        capabilities: isEndpointHost ? capabilities : [],
      });

      if (onClick) {
        onClick();
      }
    }
  }, [
    isDisabled,
    showResponseActionsConsole,
    agentId,
    agentType,
    hostName,
    platform,
    isEndpointHost,
    capabilities,
    onClick,
  ]);

  return useMemo(() => {
    return {
      isDisabled: isEndpointHost ? isDisabled : true,
      tooltip: isEndpointHost ? tooltip : NOT_FROM_ENDPOINT_HOST_TOOLTIP,
      handleResponseActionsClick,
    };
  }, [handleResponseActionsClick, isDisabled, isEndpointHost, tooltip]);
};
