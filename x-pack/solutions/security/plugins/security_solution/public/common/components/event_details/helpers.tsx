/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

/** Returns example text, or an empty string if the field does not have an example */
export const getExampleText = (example: string | number | null | undefined): string =>
  !isEmpty(example) ? `Example: ${example}` : '';

export const getIconFromType = (type: string | null | undefined) => {
  switch (type) {
    case 'string': // fall through
    case 'keyword':
      return 'string';
    case 'number': // fall through
    case 'long':
      return 'number';
    case 'date':
      return 'clock';
    case 'ip':
    case 'geo_point':
      return 'globe';
    case 'object':
      return 'questionInCircle';
    case 'float':
      return 'number';
    default:
      return 'questionInCircle';
  }
};

export const EVENT_FIELDS_TABLE_CLASS_NAME = 'event-fields-table';
