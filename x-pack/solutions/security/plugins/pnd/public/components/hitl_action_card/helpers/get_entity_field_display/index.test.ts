/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityFieldDisplay } from '.';

describe('getEntityFieldDisplay', () => {
  it('returns a host label for host.name', () => {
    expect(getEntityFieldDisplay('host.name').label).toEqual('Host');
  });

  it('returns a user label for user.name', () => {
    expect(getEntityFieldDisplay('user.name').label).toEqual('User');
  });

  it('returns a source label for source.ip', () => {
    expect(getEntityFieldDisplay('source.ip').label).toEqual('Source IP');
  });

  it('returns a destination label for destination.ip', () => {
    expect(getEntityFieldDisplay('destination.ip').label).toEqual('Destination IP');
  });

  it('returns the user icon for user.name', () => {
    expect(getEntityFieldDisplay('user.name').iconType).toEqual('user');
  });

  it('returns the storage icon for host.name', () => {
    expect(getEntityFieldDisplay('host.name').iconType).toEqual('storage');
  });

  it('returns the globe icon for source.ip', () => {
    expect(getEntityFieldDisplay('source.ip').iconType).toEqual('globe');
  });

  it('returns the raw ECS field name for a field it has no label for', () => {
    expect(getEntityFieldDisplay('process.name').label).toEqual('process.name');
  });

  it('returns a neutral icon for a field it has no label for', () => {
    expect(getEntityFieldDisplay('process.name').iconType).toEqual('dot');
  });

  it('returns the raw name for an empty field rather than inventing one', () => {
    expect(getEntityFieldDisplay('').label).toEqual('');
  });
});
