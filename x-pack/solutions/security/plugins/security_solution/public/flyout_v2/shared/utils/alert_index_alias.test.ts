/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertIndexAlias } from './alert_index_alias';

describe('getAlertIndexAlias', () => {
  it('resolves a backing alerts index to its space-scoped alias', () => {
    expect(
      getAlertIndexAlias('.internal.alerts-security.alerts-default-000001', 'default')
    ).toEqual('.alerts-security.alerts-default');
  });

  it('resolves a backing preview index to its space-scoped alias', () => {
    expect(
      getAlertIndexAlias('.internal.preview.alerts-security.alerts-default-000001', 'default')
    ).toEqual('.preview.alerts-security.alerts-default');
  });

  it('honors the provided space id', () => {
    expect(getAlertIndexAlias('.internal.alerts-security.alerts-custom-000001', 'custom')).toEqual(
      '.alerts-security.alerts-custom'
    );
  });

  it('defaults to the default space when none is provided', () => {
    expect(getAlertIndexAlias('.internal.alerts-security.alerts-default-000001')).toEqual(
      '.alerts-security.alerts-default'
    );
  });

  it('returns undefined for a regular source index', () => {
    expect(
      getAlertIndexAlias('.ds-logs-endpoint.events.file-default-2026.08.18-000301', 'default')
    ).toBeUndefined();
  });

  it('returns undefined for a cross-cluster index name', () => {
    expect(
      getAlertIndexAlias('remote:.ds-logs-endpoint.events.file-default', 'default')
    ).toBeUndefined();
  });
});
