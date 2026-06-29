/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEmbeddedAlertId } from '.';

describe('parseEmbeddedAlertId', () => {
  it('parses the _id when it is the first line', () => {
    expect(parseEmbeddedAlertId('_id,abc-123\nhost.name,web-01')).toEqual('abc-123');
  });

  it('parses the _id when another sorted field precedes it', () => {
    expect(parseEmbeddedAlertId('@timestamp,2026-01-01\n_id,abc-123\nhost.name,web-01')).toEqual(
      'abc-123'
    );
  });

  it('returns undefined when there is no embedded _id', () => {
    expect(parseEmbeddedAlertId('host.name,web-01\nuser.name,root')).toBeUndefined();
  });

  it('returns undefined when the _id value is empty', () => {
    expect(parseEmbeddedAlertId('_id,\nhost.name,web-01')).toBeUndefined();
  });

  it('does not match a field whose name merely contains _id', () => {
    expect(parseEmbeddedAlertId('kibana.alert._id_extra,xyz\nhost.name,web-01')).toBeUndefined();
  });

  it('trims surrounding whitespace from the parsed id', () => {
    expect(parseEmbeddedAlertId('_id,  abc-123  \nhost.name,web-01')).toEqual('abc-123');
  });
});
