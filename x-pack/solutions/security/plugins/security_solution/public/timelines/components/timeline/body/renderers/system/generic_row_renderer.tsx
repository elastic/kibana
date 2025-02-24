/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import React from 'react';

import type { RowRenderer } from '../../../../../../../common/types/timeline';
import { RowRendererIdEnum } from '../../../../../../../common/api/timeline';

import { DnsRequestEventDetails } from '../dns/dns_request_event_details';
import { EndgameSecurityEventDetails } from '../endgame/endgame_security_event_details';
import { isFileEvent, isNillEmptyOrNotFinite } from '../helpers';
import { RegistryEventDetails } from '../registry/registry_event_details';
import { RowRendererContainer } from '../row_renderer';

import { SystemGenericDetails } from './generic_details';
import { SystemGenericFileDetails } from './generic_file_details';
import * as i18n from './translations';

export const createGenericSystemRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  id: RowRendererIdEnum.system,
  isInstance: (ecs) => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'system' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <SystemGenericDetails
        contextId={`${actionName}-${scopeId}`}
        data={data}
        text={text}
        timelineId={scopeId}
      />
    </RowRendererContainer>
  ),
});

export const createEndgameProcessRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  id: RowRendererIdEnum.system_file,
  isInstance: (ecs) => {
    const action: string | null | undefined = get('event.action[0]', ecs);
    const category: string | null | undefined = get('event.category[0]', ecs);
    const dataset: string | null | undefined = get('event.dataset[0]', ecs);
    return (
      (category?.toLowerCase() === 'process' ||
        dataset?.toLowerCase() === 'endpoint.events.process') &&
      action?.toLowerCase() === actionName
    );
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <SystemGenericFileDetails
        data={data}
        contextId={`endgame-process-${actionName}-${scopeId}`}
        showMessage={false}
        text={text}
        timelineId={scopeId}
      />
    </RowRendererContainer>
  ),
});

export const createFimRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  id: RowRendererIdEnum.system_fim,
  isInstance: (ecs) => {
    const action: string | null | undefined = get('event.action[0]', ecs);
    const category: string | null | undefined = get('event.category[0]', ecs);
    const dataset: string | null | undefined = get('event.dataset[0]', ecs);
    return (
      isFileEvent({ eventCategory: category, eventDataset: dataset }) &&
      action?.toLowerCase() === actionName
    );
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <SystemGenericFileDetails
        data={data}
        contextId={`fim-${actionName}-${scopeId}`}
        showMessage={false}
        text={text}
        timelineId={scopeId}
      />
    </RowRendererContainer>
  ),
});

export interface EndpointAlertCriteria {
  eventAction: string;
  eventCategory: string;
  eventType: string;
  skipRedundantFileDetails?: boolean;
  skipRedundantProcessDetails?: boolean;
  text: string;
}

export const createEndpointAlertsRowRenderer = ({
  eventAction,
  eventCategory,
  eventType,
  skipRedundantFileDetails = false,
  skipRedundantProcessDetails = false,
  text,
}: EndpointAlertCriteria): RowRenderer => ({
  id: RowRendererIdEnum.alerts,
  isInstance: (ecs) => {
    const action: string[] | null | undefined = get('event.action', ecs);
    const category: string[] | null | undefined = get('event.category', ecs);
    const dataset: string | null | undefined = get('event.dataset[0]', ecs);
    const type: string[] | null | undefined = get('event.type', ecs);

    const eventActionMatches = action?.includes(eventAction) ?? false;
    const eventCategoryMatches = category?.includes(eventCategory) ?? false;
    const eventTypeMatches = type?.includes(eventType) ?? false;

    return (
      dataset?.toLowerCase() === 'endpoint.alerts' &&
      eventTypeMatches &&
      eventCategoryMatches &&
      eventActionMatches
    );
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <SystemGenericFileDetails
        contextId={`endpoint-alerts-row-renderer-${eventAction}-${eventCategory}-${eventType}-${scopeId}`}
        data={data}
        showMessage={false}
        skipRedundantFileDetails={skipRedundantFileDetails}
        skipRedundantProcessDetails={skipRedundantProcessDetails}
        text={text}
        timelineId={scopeId}
      />
    </RowRendererContainer>
  ),
});

export const createEndpointLibraryRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  id: RowRendererIdEnum.library,
  isInstance: (ecs) => {
    const action: string | null | undefined = get('event.action[0]', ecs);
    const dataset: string | null | undefined = get('event.dataset[0]', ecs);
    return (
      dataset?.toLowerCase() === 'endpoint.events.library' && action?.toLowerCase() === actionName
    );
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <SystemGenericFileDetails
        contextId={`library-row-renderer-${actionName}-${scopeId}`}
        data={data}
        showMessage={false}
        text={text}
        timelineId={scopeId}
      />
    </RowRendererContainer>
  ),
});

export const createGenericFileRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  id: RowRendererIdEnum.system_file,
  isInstance: (ecs) => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'system' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <SystemGenericFileDetails
        contextId={`${actionName}-${scopeId}`}
        data={data}
        text={text}
        timelineId={scopeId}
      />
    </RowRendererContainer>
  ),
});

export const createSocketRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  id: RowRendererIdEnum.system_socket,
  isInstance: (ecs) => {
    const action: string | null | undefined = get('event.action[0]', ecs);
    return action != null && action.toLowerCase() === actionName;
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <SystemGenericFileDetails
        contextId={`socket-${actionName}-${scopeId}`}
        data={data}
        text={text}
        timelineId={scopeId}
      />
    </RowRendererContainer>
  ),
});

export const createSecurityEventRowRenderer = ({
  actionName,
}: {
  actionName: string;
}): RowRenderer => ({
  id: RowRendererIdEnum.system_security_event,
  isInstance: (ecs) => {
    const category: string | null | undefined = get('event.category[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
    const dataset: string | null | undefined = get('event.dataset[0]', ecs);
    return (
      (category?.toLowerCase() === 'authentication' ||
        dataset?.toLowerCase() === 'endpoint.events.security') &&
      action?.toLowerCase() === actionName
    );
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <EndgameSecurityEventDetails
        contextId={`authentication-${actionName}-${scopeId}`}
        data={data}
        timelineId={scopeId}
      />
    </RowRendererContainer>
  ),
});

export const createDnsRowRenderer = (): RowRenderer => ({
  id: RowRendererIdEnum.system_dns,
  isInstance: (ecs) => {
    const dnsQuestionType: string | null | undefined = get('dns.question.type[0]', ecs);
    const dnsQuestionName: string | null | undefined = get('dns.question.name[0]', ecs);
    return !isNillEmptyOrNotFinite(dnsQuestionType) && !isNillEmptyOrNotFinite(dnsQuestionName);
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <DnsRequestEventDetails
        contextId={`dns-request-${scopeId}`}
        data={data}
        timelineId={scopeId}
      />
    </RowRendererContainer>
  ),
});

export const createEndpointRegistryRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  id: RowRendererIdEnum.registry,
  isInstance: (ecs) => {
    const action: string | null | undefined = get('event.action[0]', ecs);
    const dataset: string | null | undefined = get('event.dataset[0]', ecs);

    return (
      dataset?.toLowerCase() === 'endpoint.events.registry' && action?.toLowerCase() === actionName
    );
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <RegistryEventDetails contextId={`registry-event-${scopeId}`} data={data} text={text} />
    </RowRendererContainer>
  ),
});

const systemLoginRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_login',
  text: i18n.ATTEMPTED_LOGIN,
});

const systemProcessStartedRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_started',
  text: i18n.PROCESS_STARTED,
});

const endgameProcessStartedRowRenderer = createEndgameProcessRowRenderer({
  actionName: 'creation_event',
  text: i18n.PROCESS_STARTED,
});

const endpointProcessStartRowRenderer = createEndgameProcessRowRenderer({
  actionName: 'start',
  text: i18n.PROCESS_STARTED,
});

const endpointRegistryModificationRowRenderer = createEndpointRegistryRowRenderer({
  actionName: 'modification',
  text: i18n.MODIFIED_REGISTRY_KEY,
});

const systemProcessStoppedRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_stopped',
  text: i18n.PROCESS_STOPPED,
});

const endgameProcessTerminationRowRenderer = createEndgameProcessRowRenderer({
  actionName: 'termination_event',
  text: i18n.TERMINATED_PROCESS,
});

const endpointProcessEndRowRenderer = createEndgameProcessRowRenderer({
  actionName: 'end',
  text: i18n.TERMINATED_PROCESS,
});

const endgameFileCreateEventRowRenderer = createFimRowRenderer({
  actionName: 'file_create_event',
  text: i18n.CREATED_FILE,
});

const endpointFileCreationEventRowRenderer = createFimRowRenderer({
  actionName: 'creation',
  text: i18n.CREATED_FILE,
});

const fimFileCreateEventRowRenderer = createFimRowRenderer({
  actionName: 'created',
  text: i18n.CREATED_FILE,
});

const endgameFileDeleteEventRowRenderer = createFimRowRenderer({
  actionName: 'file_delete_event',
  text: i18n.DELETED_FILE,
});

const endpointFileDeletionEventRowRenderer = createFimRowRenderer({
  actionName: 'deletion',
  text: i18n.DELETED_FILE,
});

const endpointModificationEventRowRenderer = createFimRowRenderer({
  actionName: 'modification',
  text: i18n.MODIFIED_FILE,
});

const endpointFileOverwriteEventRowRenderer = createFimRowRenderer({
  actionName: 'overwrite',
  text: i18n.OVERWROTE_FILE,
});

const endpointFileRenamedEventRowRenderer = createFimRowRenderer({
  actionName: 'rename',
  text: i18n.RENAMED_FILE,
});

const fimFileDeletedEventRowRenderer = createFimRowRenderer({
  actionName: 'deleted',
  text: i18n.DELETED_FILE,
});

const systemExistingRowRenderer = createGenericFileRowRenderer({
  actionName: 'existing_process',
  text: i18n.EXISTING_PROCESS,
});

const endpointAlertCriteria: EndpointAlertCriteria[] = [
  {
    eventAction: 'creation',
    eventCategory: 'file',
    eventType: 'denied',
    skipRedundantProcessDetails: true,
    text: i18n.WAS_PREVENTED_FROM_CREATING_A_MALICIOUS_FILE,
  },
  {
    eventAction: 'creation',
    eventCategory: 'file',
    eventType: 'allowed',
    skipRedundantProcessDetails: true,
    text: i18n.WAS_DETECTED_CREATING_A_MALICIOUS_FILE,
  },
  {
    eventAction: 'files-encrypted',
    eventCategory: 'file',
    eventType: 'denied',
    skipRedundantFileDetails: true,
    text: i18n.RANSOMWARE_WAS_PREVENTED_FROM_ENCRYPTING_FILES,
  },
  {
    eventAction: 'files-encrypted',
    eventCategory: 'file',
    eventType: 'allowed',
    skipRedundantFileDetails: true,
    text: i18n.RANSOMWARE_WAS_DETECTED_ENCRYPTING_FILES,
  },
  {
    eventAction: 'modification',
    eventCategory: 'file',
    eventType: 'denied',
    skipRedundantProcessDetails: true,
    text: i18n.WAS_PREVENTED_FROM_MODIFYING_A_MALICIOUS_FILE,
  },
  {
    eventAction: 'modification',
    eventCategory: 'file',
    eventType: 'allowed',
    skipRedundantProcessDetails: true,
    text: i18n.WAS_DETECTED_MODIFYING_A_MALICIOUS_FILE,
  },
  {
    eventAction: 'rename',
    eventCategory: 'file',
    eventType: 'denied',
    skipRedundantProcessDetails: true,
    text: i18n.WAS_PREVENTED_FROM_RENAMING_A_MALICIOUS_FILE,
  },
  {
    eventAction: 'rename',
    eventCategory: 'file',
    eventType: 'allowed',
    skipRedundantProcessDetails: true,
    text: i18n.WAS_DETECTED_RENAMING_A_MALICIOUS_FILE,
  },
  {
    eventAction: 'execution',
    eventCategory: 'process',
    eventType: 'denied',
    skipRedundantFileDetails: true,
    text: i18n.WAS_PREVENTED_FROM_EXECUTING_A_MALICIOUS_PROCESS,
  },
  {
    eventAction: 'execution',
    eventCategory: 'process',
    eventType: 'allowed',
    skipRedundantFileDetails: true,
    text: i18n.WAS_DETECTED_EXECUTING_A_MALICIOUS_PROCESS,
  },
];

const endpointAlertsRowRenderers: RowRenderer[] = endpointAlertCriteria.map((criteria) =>
  createEndpointAlertsRowRenderer(criteria)
);

const endpointLibraryLoadRowRenderer = createEndpointLibraryRowRenderer({
  actionName: 'load',
  text: i18n.LOADED_LIBRARY,
});

const systemSocketOpenedRowRenderer = createSocketRowRenderer({
  actionName: 'socket_opened',
  text: i18n.SOCKET_OPENED,
});

const systemSocketClosedRowRenderer = createSocketRowRenderer({
  actionName: 'socket_closed',
  text: i18n.SOCKET_CLOSED,
});

const endgameIpv4ConnectionAcceptEventRowRenderer = createSocketRowRenderer({
  actionName: 'ipv4_connection_accept_event',
  text: i18n.ACCEPTED_A_CONNECTION_VIA,
});

const endpointConnectionAcceptedEventRowRenderer = createSocketRowRenderer({
  actionName: 'connection_accepted',
  text: i18n.ACCEPTED_A_CONNECTION_VIA,
});

const endpointHttpRequestEventRowRenderer = createSocketRowRenderer({
  actionName: 'http_request',
  text: i18n.MADE_A_HTTP_REQUEST_VIA,
});

const endpointProcessExecRowRenderer = createEndgameProcessRowRenderer({
  actionName: 'exec',
  text: i18n.EXECUTED_PROCESS,
});

const endpointProcessForkRowRenderer = createEndgameProcessRowRenderer({
  actionName: 'fork',
  text: i18n.FORKED_PROCESS,
});

const endgameIpv6ConnectionAcceptEventRowRenderer = createSocketRowRenderer({
  actionName: 'ipv6_connection_accept_event',
  text: i18n.ACCEPTED_A_CONNECTION_VIA,
});

const endgameIpv4DisconnectReceivedEventRowRenderer = createSocketRowRenderer({
  actionName: 'ipv4_disconnect_received_event',
  text: i18n.DISCONNECTED_VIA,
});

const endpointDisconnectReceivedEventRowRenderer = createSocketRowRenderer({
  actionName: 'disconnect_received',
  text: i18n.DISCONNECTED_VIA,
});

const endgameIpv6DisconnectReceivedEventRowRenderer = createSocketRowRenderer({
  actionName: 'ipv6_disconnect_received_event',
  text: i18n.DISCONNECTED_VIA,
});

const endgameAdminLogonRowRenderer = createSecurityEventRowRenderer({
  actionName: 'admin_logon',
});

const endgameExplicitUserLogonRowRenderer = createSecurityEventRowRenderer({
  actionName: 'explicit_user_logon',
});

const endgameUserLogoffRowRenderer = createSecurityEventRowRenderer({
  actionName: 'user_logoff',
});

const endgameUserLogonRowRenderer = createSecurityEventRowRenderer({
  actionName: 'user_logon',
});

const endpointUserLogOnRowRenderer = createSecurityEventRowRenderer({
  actionName: 'log_on',
});

const dnsRowRenderer = createDnsRowRenderer();

const systemExistingUserRowRenderer = createGenericSystemRowRenderer({
  actionName: 'existing_user',
  text: i18n.EXISTING_USER,
});

const systemExistingSocketRowRenderer = createGenericFileRowRenderer({
  actionName: 'existing_socket',
  text: i18n.EXISTING_SOCKET,
});

const systemExistingPackageRowRenderer = createGenericSystemRowRenderer({
  actionName: 'existing_package',
  text: i18n.EXISTING_PACKAGE,
});

const systemInvalidRowRenderer = createGenericFileRowRenderer({
  actionName: 'invalid',
  text: i18n.INVALID,
});

const systemUserChangedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_changed',
  text: i18n.USER_CHANGED,
});

const systemHostChangedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'host',
  text: i18n.HOST_CHANGED,
});

const systemUserAddedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_added',
  text: i18n.USER_ADDED,
});

const systemLogoutRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_logout',
  text: i18n.LOGGED_OUT,
});

const endpointUserLogOffRowRenderer = createSecurityEventRowRenderer({
  actionName: 'log_off',
});

const systemProcessErrorRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_error',
  text: i18n.PROCESS_ERROR,
});

// TODO: Remove this once this has been replaced everywhere with "error" below
const systemErrorRowRendererDeprecated = createGenericSystemRowRenderer({
  actionName: 'error:',
  text: i18n.ERROR,
});

const systemErrorRowRenderer = createGenericSystemRowRenderer({
  actionName: 'error',
  text: i18n.ERROR,
});

const systemPackageInstalledRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_installed',
  text: i18n.PACKAGE_INSTALLED,
});

const systemBootRowRenderer = createGenericSystemRowRenderer({
  actionName: 'boot',
  text: i18n.BOOT,
});

const systemAcceptedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'accepted',
  text: i18n.ACCEPTED,
});

const systemPackageUpdatedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_updated',
  text: i18n.PACKAGE_UPDATED,
});

const systemPackageRemovedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_removed',
  text: i18n.PACKAGE_REMOVED,
});

const systemUserRemovedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_removed',
  text: i18n.USER_REMOVED,
});

export const systemRowRenderers: RowRenderer[] = [
  dnsRowRenderer,
  endgameAdminLogonRowRenderer,
  endgameExplicitUserLogonRowRenderer,
  endgameFileCreateEventRowRenderer,
  endpointFileCreationEventRowRenderer,
  endgameFileDeleteEventRowRenderer,
  endpointFileDeletionEventRowRenderer,
  endpointFileOverwriteEventRowRenderer,
  endpointFileRenamedEventRowRenderer,
  ...endpointAlertsRowRenderers,
  endpointLibraryLoadRowRenderer,
  endpointModificationEventRowRenderer,
  endpointRegistryModificationRowRenderer,
  endgameIpv4ConnectionAcceptEventRowRenderer,
  endpointConnectionAcceptedEventRowRenderer,
  endpointHttpRequestEventRowRenderer,
  endpointProcessExecRowRenderer,
  endpointProcessForkRowRenderer,
  endgameIpv6ConnectionAcceptEventRowRenderer,
  endgameIpv4DisconnectReceivedEventRowRenderer,
  endpointDisconnectReceivedEventRowRenderer,
  endgameIpv6DisconnectReceivedEventRowRenderer,
  endgameProcessStartedRowRenderer,
  endpointProcessStartRowRenderer,
  endgameProcessTerminationRowRenderer,
  endpointProcessEndRowRenderer,
  endgameUserLogoffRowRenderer,
  endgameUserLogonRowRenderer,
  endpointUserLogOnRowRenderer,
  fimFileCreateEventRowRenderer,
  fimFileDeletedEventRowRenderer,
  systemAcceptedRowRenderer,
  systemBootRowRenderer,
  systemErrorRowRenderer,
  systemErrorRowRendererDeprecated,
  systemExistingPackageRowRenderer,
  systemExistingRowRenderer,
  systemExistingSocketRowRenderer,
  systemExistingUserRowRenderer,
  systemHostChangedRowRenderer,
  systemInvalidRowRenderer,
  systemLoginRowRenderer,
  systemLogoutRowRenderer,
  endpointUserLogOffRowRenderer,
  systemPackageInstalledRowRenderer,
  systemPackageUpdatedRowRenderer,
  systemPackageRemovedRowRenderer,
  systemProcessErrorRowRenderer,
  systemProcessStartedRowRenderer,
  systemProcessStoppedRowRenderer,
  systemSocketClosedRowRenderer,
  systemSocketOpenedRowRenderer,
  systemUserAddedRowRenderer,
  systemUserChangedRowRenderer,
  systemUserRemovedRowRenderer,
];
