/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';

export type DateFormatter = (timestamp?: string) => string;

/**
 * Formats timestamps using the Kibana locale when set, otherwise the browser
 * locale, instead of Moment's default US `L` (MM/DD/YYYY) format.
 */
export function useDateFormat(): DateFormatter {
  const preferredLocale = i18n.getLocale() ?? navigator.language;

  return (timestamp?: string) => {
    if (!timestamp) return '';
    const date = moment(timestamp).locale(preferredLocale);
    return `${date.format('ll')} @ ${date.format('LTS')}`;
  };
}
