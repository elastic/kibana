/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { isEmpty, isNumber } from 'lodash/fp';
import React from 'react';
import { css } from '@emotion/css';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import { getAgentTypeForAgentIdField } from '../../../../../common/lib/endpoint/utils/get_agent_type_for_agent_id_field';
import {
  ALERT_HOST_CRITICALITY,
  ALERT_SERVICE_CRITICALITY,
  ALERT_USER_CRITICALITY,
} from '../../../../../../common/field_maps/field_names';
import { AgentStatus } from '../../../../../common/components/endpoint/agents/agent_status';
import { INDICATOR_REFERENCE } from '../../../../../../common/cti/constants';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { Bytes, BYTES_FORMAT } from './bytes';
import { Duration, EVENT_DURATION_FIELD_NAME } from '../../../duration';
import { getOrEmptyTagFromValue } from '../../../../../common/components/empty_value';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { FormattedIp } from '../../../formatted_ip';
import { Port } from '../../../../../explore/network/components/port';
import { PORT_NAMES } from '../../../../../explore/network/components/port/helpers';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import {
  AGENT_STATUS_FIELD_NAME,
  DATE_FIELD_TYPE,
  EVENT_MODULE_FIELD_NAME,
  EVENT_URL_FIELD_NAME,
  GEO_FIELD_TYPE,
  IP_FIELD_TYPE,
  MESSAGE_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
} from './constants';
import { renderEventModule, RenderRuleName, renderUrl } from './formatted_field_helpers';
import { RuleStatus } from './rule_status';
import { HostName } from './host_name';
import { UserName } from './user_name';
import { AssetCriticalityLevel } from './asset_criticality_level';
import { ServiceName } from './service_name';

// simple black-list to prevent dragging and dropping fields such as message name
const columnNamesNotDraggable = [MESSAGE_FIELD_NAME];

// Offset top-aligned tooltips so that cell actions are more visible
const dataGridToolTipOffset = css`
  &[data-position='top'] {
    margin-block-start: -8px;
  }
`;

const FormattedFieldValueComponent: React.FC<{
  asPlainText?: boolean;
  /** `Component` is only used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  contextId: string;
  eventId?: string;
  isAggregatable?: boolean;
  isObjectArray?: boolean;
  isUnifiedDataTable?: boolean;
  fieldFormat?: string;
  fieldFromBrowserField?: Partial<FieldSpec>;
  fieldName: string;
  fieldType?: string;
  isButton?: boolean;
  onClick?: () => void;
  onClickAriaLabel?: string;
  title?: string;
  truncate?: boolean;
  value: string | number | undefined | null;
  linkValue?: string | null | undefined;
}> = ({
  asPlainText,
  Component,
  contextId,
  eventId,
  fieldFormat,
  isAggregatable = false,
  isUnifiedDataTable,
  fieldName,
  fieldType = '',
  fieldFromBrowserField,
  isButton,
  isObjectArray = false,
  onClick,
  onClickAriaLabel,
  title,
  truncate = true,
  value,
  linkValue,
}) => {
  if (isObjectArray || asPlainText) {
    return <span data-test-subj={`formatted-field-${fieldName}`}>{value}</span>;
  } else if (fieldType === IP_FIELD_TYPE) {
    return (
      <FormattedIp
        Component={Component}
        fieldName={fieldName}
        isButton={isButton}
        value={!isNumber(value) ? value : String(value)}
        onClick={onClick}
        title={title}
      />
    );
  } else if (fieldType === GEO_FIELD_TYPE) {
    return <>{value}</>;
  } else if (fieldType === DATE_FIELD_TYPE) {
    const classNames = truncate ? 'eui-textTruncate' : undefined;
    const date = (
      <FormattedDate
        className={classNames}
        fieldName={fieldName}
        value={value}
        tooltipProps={
          isUnifiedDataTable ? undefined : { position: 'bottom', className: dataGridToolTipOffset }
        }
      />
    );
    if (isUnifiedDataTable) return date;
    return date;
  } else if (PORT_NAMES.some((portName) => fieldName === portName)) {
    return <Port Component={Component} title={title} value={`${value}`} />;
  } else if (fieldName === EVENT_DURATION_FIELD_NAME) {
    return <Duration fieldName={fieldName} value={`${value}`} />;
  } else if (fieldName === EntityTypeToIdentifierField.host) {
    return (
      <HostName
        Component={Component}
        contextId={contextId}
        isButton={isButton}
        onClick={onClick}
        title={title}
        value={value}
      />
    );
  } else if (fieldName === EntityTypeToIdentifierField.user) {
    return (
      <UserName
        Component={Component}
        contextId={contextId}
        isButton={isButton}
        onClick={onClick}
        title={title}
        value={value}
      />
    );
  } else if (fieldName === EntityTypeToIdentifierField.service) {
    return (
      <ServiceName
        Component={Component}
        contextId={contextId}
        isButton={isButton}
        onClick={onClick}
        title={title}
        value={value}
      />
    );
  } else if (fieldFormat === BYTES_FORMAT) {
    return <Bytes value={`${value}`} />;
  } else if (fieldName === SIGNAL_RULE_NAME_FIELD_NAME) {
    return (
      <RenderRuleName
        Component={Component}
        fieldName={fieldName}
        isButton={isButton}
        onClick={onClick}
        linkValue={linkValue}
        title={title}
        truncate={truncate}
        value={value}
      />
    );
  } else if (fieldName === EVENT_MODULE_FIELD_NAME) {
    return renderEventModule({
      linkValue,
      truncate,
      value,
    });
  } else if (fieldName === SIGNAL_STATUS_FIELD_NAME) {
    return (
      <RuleStatus
        value={value}
        onClick={onClick}
        onClickAriaLabel={onClickAriaLabel}
        iconType={isButton ? 'arrowDown' : undefined}
        iconSide={isButton ? 'right' : undefined}
      />
    );
  } else if (
    fieldName === ALERT_HOST_CRITICALITY ||
    fieldName === ALERT_USER_CRITICALITY ||
    fieldName === ALERT_SERVICE_CRITICALITY
  ) {
    return <AssetCriticalityLevel value={value} />;
  } else if (fieldName === AGENT_STATUS_FIELD_NAME) {
    return (
      <AgentStatus
        agentId={String(value ?? '')}
        agentType={getAgentTypeForAgentIdField(fieldFromBrowserField?.name ?? '')}
        data-test-subj="endpointHostAgentStatus"
      />
    );
  } else if (
    [
      RULE_REFERENCE_FIELD_NAME,
      REFERENCE_URL_FIELD_NAME,
      EVENT_URL_FIELD_NAME,
      INDICATOR_REFERENCE,
    ].includes(fieldName)
  ) {
    return renderUrl({
      Component,
      truncate,
      title,
      value,
    });
  } else if (isUnifiedDataTable || columnNamesNotDraggable.includes(fieldName)) {
    return truncate && !isEmpty(value) ? (
      <TruncatableText data-test-subj="truncatable-message">
        <EuiToolTip
          data-test-subj="message-tool-tip"
          position="bottom"
          className={dataGridToolTipOffset}
          content={
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <span>{fieldName}</span>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span>{value}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <span data-test-subj={`formatted-field-${fieldName}`}>{value}</span>
        </EuiToolTip>
      </TruncatableText>
    ) : (
      <span data-test-subj={`formatted-field-${fieldName}`}>{value}</span>
    );
  } else {
    // This should not be reached for the unified data table
    const contentValue = getOrEmptyTagFromValue(value);
    const content = truncate ? <TruncatableText>{contentValue}</TruncatableText> : contentValue;
    return (
      <DefaultDraggable
        field={fieldName}
        id={`event-details-value-default-draggable-${contextId}-${eventId}-${fieldName}-${value}`}
        fieldType={fieldType ?? ''}
        isAggregatable={isAggregatable}
        value={`${value}`}
        tooltipContent={
          fieldType === DATE_FIELD_TYPE || fieldType === EVENT_DURATION_FIELD_NAME
            ? null
            : fieldName
        }
      >
        {content}
      </DefaultDraggable>
    );
  }
};

export const FormattedFieldValue = React.memo(FormattedFieldValueComponent);
