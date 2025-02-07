/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { AlertField } from './alert_field';
import type { RowRenderer } from '../../../../../../../common/types';
import { RowRendererIdEnum } from '../../../../../../../common/api/timeline';
import {
  DESTINATION_IP,
  DESTINATION_PORT,
  EVENT_CATEGORY,
  eventKindMatches,
  FILE_NAME,
  HOST_NAME,
  ID,
  KIBANA_ALERT_RULE_NAME,
  KIBANA_ALERT_SEVERITY,
  PROCESS_NAME,
  PROCESS_PARENT_NAME,
  showWith,
  SOURCE_IP,
  SOURCE_PORT,
  USER_NAME,
  WITH_FIELD_NAMES,
} from './helpers';
import { Details } from '../helpers';
import { RowRendererContainer } from '../row_renderer';
import * as i18n from './translations';

export const DEFAULT_CONTEXT_ID = 'alert-renderer';

export const ALERT_RENDERER_FIELDS = [
  DESTINATION_IP,
  DESTINATION_PORT,
  EVENT_CATEGORY,
  FILE_NAME,
  HOST_NAME,
  KIBANA_ALERT_RULE_NAME,
  KIBANA_ALERT_SEVERITY,
  PROCESS_NAME,
  PROCESS_PARENT_NAME,
  SOURCE_IP,
  SOURCE_PORT,
  USER_NAME,
];

export const alertRenderer: RowRenderer = {
  id: RowRendererIdEnum.alert,
  isInstance: (ecs) => eventKindMatches(get('event.kind', ecs)),
  renderRow: ({ contextId = DEFAULT_CONTEXT_ID, data, scopeId }) => {
    const eventId = get(ID, data);
    const destinationIp = get(DESTINATION_IP, data);
    const destinationPort = get(DESTINATION_PORT, data);
    const eventCategory = get(EVENT_CATEGORY, data);
    const fileName = get(FILE_NAME, data);
    const hostName = get(HOST_NAME, data);
    const kibanaAlertRuleName = get(KIBANA_ALERT_RULE_NAME, data);
    const kibanaAlertSeverity = get(KIBANA_ALERT_SEVERITY, data);
    const processName = get(PROCESS_NAME, data);
    const processParentName = get(PROCESS_PARENT_NAME, data);
    const sourceIp = get(SOURCE_IP, data);
    const sourcePort = get(SOURCE_PORT, data);
    const userName = get(USER_NAME, data);

    return (
      <RowRendererContainer>
        <Details data-test-subj="alertRenderer">
          <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="center" wrap={true}>
            <AlertField
              contextId={contextId}
              data-test-subj={EVENT_CATEGORY}
              eventId={eventId}
              field={EVENT_CATEGORY}
              scopeId={scopeId}
              values={eventCategory}
            />

            <EuiFlexItem grow={false}>
              <span data-test-subj="event">{` ${i18n.EVENT} `}</span>
            </EuiFlexItem>

            {showWith({
              data,
              fieldNames: WITH_FIELD_NAMES,
            }) && (
              <EuiFlexItem grow={false}>
                <span data-test-subj="with">{` ${i18n.WITH} `}</span>
              </EuiFlexItem>
            )}

            <AlertField
              contextId={contextId}
              data-test-subj={PROCESS_NAME}
              eventId={eventId}
              field={PROCESS_NAME}
              prefix={` ${i18n.PROCESS} `}
              suffix=", "
              scopeId={scopeId}
              values={processName}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={PROCESS_PARENT_NAME}
              eventId={eventId}
              field={PROCESS_PARENT_NAME}
              prefix={` ${i18n.PARENT_PROCESS} `}
              suffix=", "
              scopeId={scopeId}
              values={processParentName}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={FILE_NAME}
              eventId={eventId}
              field={FILE_NAME}
              prefix={` ${i18n.FILE} `}
              suffix=", "
              scopeId={scopeId}
              values={fileName}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={SOURCE_IP}
              eventId={eventId}
              field={SOURCE_IP}
              prefix={` ${i18n.SOURCE} `}
              scopeId={scopeId}
              values={sourceIp}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={SOURCE_PORT}
              eventId={eventId}
              field={SOURCE_PORT}
              prefix=":"
              suffix=", "
              scopeId={scopeId}
              values={sourcePort}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={DESTINATION_IP}
              eventId={eventId}
              field={DESTINATION_IP}
              prefix={` ${i18n.DESTINATION} `}
              scopeId={scopeId}
              values={destinationIp}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={DESTINATION_PORT}
              eventId={eventId}
              field={DESTINATION_PORT}
              prefix=":"
              suffix=", "
              scopeId={scopeId}
              values={destinationPort}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={USER_NAME}
              eventId={eventId}
              field={USER_NAME}
              prefix={` ${i18n.BY} `}
              scopeId={scopeId}
              values={userName}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={HOST_NAME}
              eventId={eventId}
              field={HOST_NAME}
              prefix={` ${i18n.ON} `}
              scopeId={scopeId}
              values={hostName}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={KIBANA_ALERT_SEVERITY}
              eventId={eventId}
              field={KIBANA_ALERT_SEVERITY}
              prefix={` ${i18n.CREATED} `}
              suffix={` ${i18n.ALERT} `}
              scopeId={scopeId}
              values={kibanaAlertSeverity}
            />

            <AlertField
              contextId={contextId}
              data-test-subj={KIBANA_ALERT_RULE_NAME}
              eventId={eventId}
              field={KIBANA_ALERT_RULE_NAME}
              suffix="."
              scopeId={scopeId}
              values={kibanaAlertRuleName}
            />
          </EuiFlexGroup>
        </Details>
      </RowRendererContainer>
    );
  },
};
