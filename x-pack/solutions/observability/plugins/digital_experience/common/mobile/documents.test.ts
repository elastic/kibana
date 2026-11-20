/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mobileDocuments } from './documents';

describe('mobileDocuments', () => {
  const { query } = mobileDocuments().toRequest();

  it('reads unmapped fields as null', () => {
    expect(query).toMatch(
      /^SET unmapped_fields = "nullify"; FROM traces-\*\.otel-\*, logs-\*\.otel-\*/
    );
  });

  it('keeps a mobile SDK name, or the Elastic distribution on a mobile os.name, iPadOS included', () => {
    expect(query).toContain(
      'WHERE (`telemetry.sdk.name` IN ("android", "iOS")) OR `resource.attributes.telemetry.distro.name` == "elastic" AND (`resource.attributes.os.name` IN ("Android", "iOS", "iPadOS"))'
    );
  });

  it('leaves out EDOT Browser, which reports the device OS too, e.g. iOS on an iPhone', () => {
    expect(query).toContain('COALESCE(`telemetry.sdk.language`, "") != "webjs"');
  });

  it('derives the platform from os.name or the SDK name, not from os.type', () => {
    expect(query).toContain(
      'EVAL platform = CASE((`resource.attributes.os.name` IN ("Android")) OR `telemetry.sdk.name` == "android", "android", "ios")'
    );
    expect(query).not.toContain('os.type');
  });
});
