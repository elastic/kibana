/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';

import { DraggableBadge } from '../../../../../../common/components/draggables';
import { isNillEmptyOrNotFinite, TokensFlexItem } from '../helpers';
import { ProcessDraggableWithNonExistentProcess } from '../process_draggable';
import { UserHostWorkingDir } from '../user_host_working_dir';

import {
  getEventDetails,
  getHostNameSeparator,
  getHumanReadableLogonType,
  getTargetUserAndTargetDomain,
  getUserDomainField,
  getUserNameField,
} from './helpers';

import * as i18n from './translations';

interface Props {
  contextId: string;
  endgameLogonType: number | null | undefined;
  endgameSubjectDomainName: string | null | undefined;
  endgameSubjectLogonId: string | null | undefined;
  endgameSubjectUserName: string | null | undefined;
  endgameTargetDomainName: string | null | undefined;
  endgameTargetLogonId: string | null | undefined;
  endgameTargetUserName: string | null | undefined;
  eventAction: string | null | undefined;
  eventCode: string | null | undefined;
  eventOutcome: string | null | undefined;
  hostName: string | null | undefined;
  id: string;
  processExecutable: string | null | undefined;
  processName: string | null | undefined;
  processPid: number | null | undefined;
  userDomain: string | null | undefined;
  userName: string | null | undefined;
  winlogEventId: string | null | undefined;
}

export const EndgameSecurityEventDetailsLine = React.memo<Props>(
  ({
    contextId,
    endgameLogonType,
    endgameSubjectDomainName,
    endgameSubjectLogonId,
    endgameSubjectUserName,
    endgameTargetDomainName,
    endgameTargetLogonId,
    endgameTargetUserName,
    eventAction,
    eventCode,
    eventOutcome,
    hostName,
    id,
    processExecutable,
    processName,
    processPid,
    userDomain,
    userName,
    winlogEventId,
  }) => {
    const domain = getTargetUserAndTargetDomain(eventAction) ? endgameTargetDomainName : userDomain;
    const eventDetails = getEventDetails({ eventAction, eventOutcome });
    const hostNameSeparator = getHostNameSeparator(eventAction);
    const user = getTargetUserAndTargetDomain(eventAction) ? endgameTargetUserName : userName;
    const userDomainField = getUserDomainField(eventAction);
    const userNameField = getUserNameField(eventAction);

    return (
      <>
        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none" wrap={true}>
          {eventAction === 'admin_logon' && (
            <TokensFlexItem component="span" data-test-subj="with-special-privileges" grow={false}>
              {i18n.WITH_SPECIAL_PRIVILEGES}
            </TokensFlexItem>
          )}

          {eventAction === 'explicit_user_logon' && (
            <TokensFlexItem component="span" data-test-subj="a-login-was-attempted" grow={false}>
              {i18n.A_LOGIN_WAS_ATTEMPTED_USING_EXPLICIT_CREDENTIALS}
            </TokensFlexItem>
          )}

          <UserHostWorkingDir
            contextId={contextId}
            eventId={id}
            hostName={hostName}
            hostNameSeparator={hostNameSeparator}
            userDomain={domain}
            userDomainField={userDomainField}
            userName={user}
            userNameField={userNameField}
            workingDirectory={undefined}
          />

          <TokensFlexItem component="span" data-test-subj="event-details" grow={false}>
            {eventDetails}
          </TokensFlexItem>

          {!isNillEmptyOrNotFinite(endgameLogonType) && (
            <>
              <TokensFlexItem component="span" data-test-subj="using-logon-type" grow={false}>
                {i18n.USING_LOGON_TYPE}
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                <DraggableBadge
                  contextId={contextId}
                  eventId={id}
                  field="endgame.logon_type"
                  queryValue={String(endgameLogonType)}
                  value={`${endgameLogonType} - ${getHumanReadableLogonType(endgameLogonType)}`}
                  isAggregatable={true}
                  fieldType="keyword"
                />
              </TokensFlexItem>
            </>
          )}

          {!isNillEmptyOrNotFinite(endgameTargetLogonId) && (
            <>
              <TokensFlexItem component="span" grow={false}>
                {'('}
              </TokensFlexItem>
              <TokensFlexItem component="span" data-test-subj="using-logon-type" grow={false}>
                {i18n.TARGET_LOGON_ID}
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                <DraggableBadge
                  contextId={contextId}
                  eventId={id}
                  field="endgame.target_logon_id"
                  value={endgameTargetLogonId}
                  isAggregatable={true}
                  fieldType="keyword"
                />
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                {')'}
              </TokensFlexItem>
            </>
          )}

          <TokensFlexItem component="span" grow={false}>
            {i18n.VIA}
          </TokensFlexItem>

          <TokensFlexItem component="span" grow={false}>
            <ProcessDraggableWithNonExistentProcess
              contextId={contextId}
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventId={id}
              processPid={processPid}
              processName={processName}
              processExecutable={processExecutable}
            />
          </TokensFlexItem>

          {!isNillEmptyOrNotFinite(endgameSubjectUserName) && (
            <>
              <TokensFlexItem
                component="span"
                data-test-subj="as-requested-by-subject"
                grow={false}
              >
                {i18n.AS_REQUESTED_BY_SUBJECT}
              </TokensFlexItem>

              <TokensFlexItem component="span" grow={false}>
                <DraggableBadge
                  contextId={contextId}
                  eventId={id}
                  field="endgame.subject_user_name"
                  iconType="user"
                  value={endgameSubjectUserName}
                  isAggregatable={true}
                  fieldType="keyword"
                />
              </TokensFlexItem>
            </>
          )}

          {endgameSubjectDomainName != null && (
            <>
              <TokensFlexItem
                component="span"
                data-test-subj="subject-domain-name-domain-separator-text"
                grow={false}
              >
                {'\\'}
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                <DraggableBadge
                  contextId={contextId}
                  eventId={id}
                  field="endgame.subject_domain_name"
                  value={endgameSubjectDomainName}
                  isAggregatable={true}
                  fieldType="keyword"
                />
              </TokensFlexItem>
            </>
          )}

          {!isNillEmptyOrNotFinite(endgameSubjectLogonId) && (
            <>
              <TokensFlexItem component="span" grow={false}>
                {'('}
              </TokensFlexItem>
              <TokensFlexItem component="span" data-test-subj="subject-login-id" grow={false}>
                {i18n.SUBJECT_LOGON_ID}
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                <DraggableBadge
                  contextId={contextId}
                  eventId={id}
                  field="endgame.subject_logon_id"
                  value={endgameSubjectLogonId}
                  isAggregatable={true}
                  fieldType="keyword"
                />
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                {')'}
              </TokensFlexItem>
            </>
          )}

          {(!isNillEmptyOrNotFinite(eventCode) || !isNillEmptyOrNotFinite(winlogEventId)) && (
            <>
              {!isNillEmptyOrNotFinite(eventCode) ? (
                <TokensFlexItem component="span" grow={false}>
                  <DraggableBadge
                    contextId={contextId}
                    eventId={id}
                    field="event.code"
                    value={eventCode}
                    isAggregatable={true}
                    fieldType="keyword"
                  />
                </TokensFlexItem>
              ) : (
                <TokensFlexItem component="span" grow={false}>
                  <DraggableBadge
                    contextId={contextId}
                    eventId={id}
                    iconType="logoWindows"
                    field="winlog.event_id"
                    value={winlogEventId}
                    isAggregatable={true}
                    fieldType="keyword"
                  />
                </TokensFlexItem>
              )}
            </>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);

EndgameSecurityEventDetailsLine.displayName = 'EndgameSecurityEventDetailsLine';
