/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeDataProviderId } from '@kbn/securitysolution-t-grid';
import type { Serializable } from '@kbn/utility-types';

import { isArray, isString, isEmpty } from 'lodash/fp';
import { INDICATOR_REFERENCE } from '../../../../common/cti/constants';
import type { DataProvider, QueryOperator } from '../../../../common/types';
import { EXISTS_OPERATOR, IS_OPERATOR } from '../../../../common/types';
import { IP_FIELD_TYPE } from '../../../explore/network/components/ip';
import { PORT_NAMES } from '../../../explore/network/components/port/helpers';
import { EVENT_DURATION_FIELD_NAME } from '../../../timelines/components/duration';
import { BYTES_FORMAT } from '../../../timelines/components/timeline/body/renderers/bytes';
import {
  GEO_FIELD_TYPE,
  MESSAGE_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
  EVENT_MODULE_FIELD_NAME,
  SIGNAL_STATUS_FIELD_NAME,
  RULE_REFERENCE_FIELD_NAME,
  REFERENCE_URL_FIELD_NAME,
  EVENT_URL_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { isCountField } from '../utils';

export const getDataProvider = ({
  field,
  id,
  value,
  operator = IS_OPERATOR,
  excluded = false,
}: {
  field: string;
  id: string;
  value: string;
  operator?: QueryOperator;
  excluded?: boolean;
}): DataProvider => ({
  and: [],
  enabled: true,
  id: escapeDataProviderId(id),
  name: field,
  excluded,
  kqlQuery: '',
  queryMatch: {
    field,
    value,
    operator,
  },
});

export interface CreateDataProviderParams {
  contextId?: string;
  eventId?: string;
  field?: string;
  fieldFormat?: string;
  fieldType?: string;
  values: string | string[] | number | number[] | boolean | boolean[];
  sourceParamType?: Serializable;
  negate?: boolean;
}

export const createDataProviders = ({
  contextId,
  eventId,
  field,
  fieldFormat,
  fieldType,
  values,
  sourceParamType,
  negate,
}: CreateDataProviderParams) => {
  if (field == null) return null;

  const arrayValues: Array<string | number | boolean | null> = Array.isArray(values)
    ? values.length > 0
      ? values
      : [null]
    : [values];

  return arrayValues.reduce<DataProvider[]>((dataProviders, rawValue, index) => {
    let id: string = '';
    const value = rawValue != null ? rawValue.toString() : rawValue;
    const appendedUniqueId = `${contextId}${eventId ? `-${eventId}` : ''}-${field}-${index}${
      value ? `-${value}` : ''
    }`;

    if (!isValidDataProviderField(field, fieldType)) {
      return dataProviders;
    }

    if (isCountField(fieldType, sourceParamType)) {
      id = `value-count-data-provider-${contextId}-${field}`;
      dataProviders.push(
        getDataProvider({ field, id, value: '', excluded: false, operator: EXISTS_OPERATOR })
      );
      return dataProviders;
    }

    if (value == null) {
      id = `empty-value-${appendedUniqueId}`;
      dataProviders.push(
        getDataProvider({ field, id, value: '', excluded: true, operator: EXISTS_OPERATOR })
      );
      return dataProviders;
    }

    if (fieldType === IP_FIELD_TYPE) {
      id = `formatted-ip-data-provider-${contextId}-${field}-${value}${
        eventId ? `-${eventId}` : ''
      }`;
      if (isString(value) && !isEmpty(value)) {
        let addresses = value;
        try {
          addresses = JSON.parse(value);
        } catch (_) {
          // Default to keeping the existing string value
        }
        if (isArray(addresses)) {
          addresses.forEach((ip) => dataProviders.push(getDataProvider({ field, id, value: ip })));
        } else {
          dataProviders.push(getDataProvider({ field, id, value: addresses }));
        }
        return dataProviders;
      }
    }

    id = getIdForField({ field, fieldFormat, appendedUniqueId, value });
    dataProviders.push(getDataProvider({ field, id, value, excluded: negate }));
    return dataProviders;
  }, []);
};

export const isValidDataProviderField = (fieldName: string, fieldType: string | undefined) =>
  fieldType !== GEO_FIELD_TYPE && fieldName !== MESSAGE_FIELD_NAME;

const getIdForField = ({
  field,
  fieldFormat,
  appendedUniqueId,
  value,
}: {
  field: string;
  fieldFormat?: string;
  appendedUniqueId: string;
  value: string;
}) => {
  let id: string;
  if (PORT_NAMES.some((portName) => field === portName)) {
    id = `port-default-${appendedUniqueId}`;
  } else if (field === EVENT_DURATION_FIELD_NAME) {
    id = `duration-default-${appendedUniqueId}`;
  } else if (fieldFormat === BYTES_FORMAT) {
    id = `bytes-default-${appendedUniqueId}`;
  } else if (field === SIGNAL_STATUS_FIELD_NAME) {
    id = `alert-field-default-${appendedUniqueId}`;
  } else if (
    [
      RULE_REFERENCE_FIELD_NAME,
      REFERENCE_URL_FIELD_NAME,
      EVENT_URL_FIELD_NAME,
      INDICATOR_REFERENCE,
      SIGNAL_RULE_NAME_FIELD_NAME,
      EVENT_MODULE_FIELD_NAME,
    ].includes(field)
  ) {
    id = `event-field-default-${appendedUniqueId}-${value}`;
  } else {
    id = `event-field-default-${appendedUniqueId}`;
  }
  return id;
};
