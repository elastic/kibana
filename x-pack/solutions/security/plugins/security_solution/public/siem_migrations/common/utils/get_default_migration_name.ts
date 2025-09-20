/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export const getDefaultMigrationName = (userName: string | undefined): string => {
  const datetime = moment(Date.now()).format('llll'); // localized date and time (e.g., "Wed, 01 Jan 2025 12:00 PM")
  if (!userName) {
    return `Migration on ${datetime}`;
  }
  return `${userName}'s migration on ${datetime}`;
};
