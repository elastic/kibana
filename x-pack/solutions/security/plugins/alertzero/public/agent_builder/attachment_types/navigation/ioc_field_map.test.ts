/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldForIocType, getIocEsqlFields } from './ioc_field_map';

describe('ioc_field_map', () => {
  it('maps ipv4-addr and ip to IP ECS fields used by the IOC builder', () => {
    const ipFields = ['source.ip', 'destination.ip', 'client.ip', 'server.ip'];
    expect(getIocEsqlFields('ipv4-addr')).toEqual(ipFields);
    expect(getIocEsqlFields('ipv6-addr')).toEqual(ipFields);
    expect(getIocEsqlFields('ip')).toEqual(ipFields);
    expect(ecsFieldForIocType('ipv4-addr')).toBe('source.ip');
    expect(ecsFieldForIocType('ip')).toBe('source.ip');
  });

  it('maps domain-name and domain to dns.question.name and url.domain', () => {
    const domainFields = ['dns.question.name', 'url.domain'];
    expect(getIocEsqlFields('domain-name')).toEqual(domainFields);
    expect(getIocEsqlFields('domain')).toEqual(domainFields);
    expect(ecsFieldForIocType('domain-name')).toBe('dns.question.name');
  });

  it('maps file-hash and hash algorithm types to hash ECS fields', () => {
    expect(getIocEsqlFields('sha256')).toEqual(['file.hash.sha256']);
    expect(getIocEsqlFields('sha1')).toEqual(['file.hash.sha1']);
    expect(getIocEsqlFields('md5')).toEqual(['file.hash.md5']);
    expect(getIocEsqlFields('file-hash')).toEqual([
      'file.hash.sha256',
      'file.hash.sha1',
      'file.hash.md5',
    ]);
    expect(getIocEsqlFields('hash')).toEqual([
      'file.hash.sha256',
      'file.hash.sha1',
      'file.hash.md5',
    ]);
    expect(ecsFieldForIocType('sha256')).toBe('file.hash.sha256');
    expect(ecsFieldForIocType('file-hash')).toBe('file.hash.sha256');
  });

  it('maps email-addr and email to user.email fields used in logs', () => {
    const emailFields = ['user.email', 'user.target.email'];
    expect(getIocEsqlFields('email-addr')).toEqual(emailFields);
    expect(getIocEsqlFields('email')).toEqual(emailFields);
    expect(ecsFieldForIocType('email-addr')).toBe('user.email');
  });

  it('returns undefined for unknown IOC types', () => {
    expect(getIocEsqlFields('unknown')).toBeUndefined();
    expect(ecsFieldForIocType('unknown')).toBeUndefined();
  });
});
