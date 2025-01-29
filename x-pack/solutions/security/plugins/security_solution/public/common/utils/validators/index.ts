/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isNumber } from 'lodash/fp';
export * from './is_endpoint_host_isolated';

const allowedSchemes = ['http:', 'https:'];

export const isUrlInvalid = (url: string | null | undefined) => {
  try {
    if (url != null) {
      if (url === '') {
        return false;
      } else {
        const urlParsed = new URL(url);
        if (
          allowedSchemes.includes(urlParsed.protocol) &&
          url.startsWith(`${urlParsed.protocol}//`)
        ) {
          return false;
        }
      }
    }
  } catch (error) {
    // intentionally left empty
  }
  return true;
};

export function hasValueToDisplay(value: string | number | null | undefined) {
  return isNumber(value) || !isEmpty(value);
}
