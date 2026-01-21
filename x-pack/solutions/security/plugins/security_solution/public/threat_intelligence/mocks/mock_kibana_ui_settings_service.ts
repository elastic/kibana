/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mocks date format or timezone for testing.
 * @param key dateFormat | dateFormat:tz
 * @returns string
 */
export function mockUiSetting(key: string): string | undefined {
  if (key === 'dateFormat') {
    return 'MMM D, YYYY @ HH:mm:ss.SSS';
  }
  if (key === 'dateFormat:tz') {
    return 'America/New_York';
  }
}
