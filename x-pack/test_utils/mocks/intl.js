/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* global jest */

export const intl = {
  formatMessage: jest.fn().mockImplementation(({ defaultMessage }) => defaultMessage),
  formatDate: jest.fn().mockImplementation(value => value),
  formatTime: jest.fn().mockImplementation(value => value),
  formatRelative: jest.fn().mockImplementation(value => value),
  formatNumber: jest.fn().mockImplementation(value => value),
  formatPlural: jest.fn().mockImplementation(value => value),
  formatHTMLMessage: jest.fn().mockImplementation(({ defaultMessage }) => defaultMessage),
  now: jest.fn().mockImplementation(() => new Date(1531834573179)),
  textComponent: 'span'
};
