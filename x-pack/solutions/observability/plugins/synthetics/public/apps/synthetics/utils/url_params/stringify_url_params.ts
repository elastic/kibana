/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'query-string';
import { CLIENT_DEFAULTS_SYNTHETICS } from '../../../../../common/constants/synthetics/client_defaults';
import { SyntheticsUrlParams } from './get_supported_url_params';
import { CLIENT_DEFAULTS } from '../../../../../common/constants';

const { FOCUS_CONNECTOR_FIELD } = CLIENT_DEFAULTS;

const { DATE_RANGE_START, DATE_RANGE_END } = CLIENT_DEFAULTS_SYNTHETICS;

export const stringifyUrlParams = (params: Partial<SyntheticsUrlParams>, ignoreEmpty = false) => {
  if (ignoreEmpty) {
    // We don't want to encode this values because they are often set to Date.now(), the relative
    // values in dateRangeStart are better for a URL.
    delete params.absoluteDateRangeStart;
    delete params.absoluteDateRangeEnd;

    replaceDefaults(params);
  }
  return `?${stringify(params, { sort: false })}`;
};

const replaceDefaults = (params: Partial<SyntheticsUrlParams>) => {
  Object.keys(params).forEach((key: string) => {
    // @ts-ignore
    const val = params[key];
    if (val == null || val === '' || val === undefined) {
      // @ts-ignore
      delete params[key];
    }
    if (key === 'dateRangeStart' && val === DATE_RANGE_START) {
      delete params[key];
    }
    if (key === 'dateRangeEnd' && val === DATE_RANGE_END) {
      delete params[key];
    }
    if (key === 'focusConnectorField' && val === FOCUS_CONNECTOR_FIELD) {
      delete params[key];
    }
  });

  return params;
};
