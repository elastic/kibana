/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlaceholderEmailHost, isPlaceholderEmailIoc } from './placeholder_email';

describe('isPlaceholderEmailHost', () => {
  it.each(['a.test', 'a.example', 'a.invalid', 'a.localhost', 'a.local', 'a.internal'])(
    'treats reserved TLD host %s as a placeholder',
    (host) => {
      expect(isPlaceholderEmailHost(host)).toBe(true);
    }
  );

  it.each([
    'example.com',
    'example.net',
    'example.org',
    'test.com',
    'domain.com',
    'host.name',
    'yourdomain.com',
    'company.com',
    'mail.example.com',
    'mail.lab.test',
    'MAIL.Example.COM',
  ])('treats %s as a placeholder', (host) => {
    expect(isPlaceholderEmailHost(host)).toBe(true);
  });

  it.each([
    'contest.com',
    'mytest.com',
    'corp.example.cloud',
    'external.example.app',
    'gmail.com',
    'evil-corp.com',
    'host.names',
  ])('does not treat %s as a placeholder', (host) => {
    expect(isPlaceholderEmailHost(host)).toBe(false);
  });
});

describe('isPlaceholderEmailIoc', () => {
  it.each(['test@test.com', 'zimbra@mail.lab.test', 'address@host.name', 'Test@TEST.COM'])(
    'is true for email %s',
    (value) => {
      expect(isPlaceholderEmailIoc({ type: 'email', value })).toBe(true);
    }
  );

  it.each([
    'tester@contest.com',
    'user@mytest.com',
    'dev-user@corp.example.cloud',
    'actor@gmail.com',
  ])('is false for email %s', (value) => {
    expect(isPlaceholderEmailIoc({ type: 'email', value })).toBe(false);
  });

  it('uses the host after the last @', () => {
    expect(isPlaceholderEmailIoc({ type: 'email', value: 'a@test.com@gmail.com' })).toBe(false);
  });

  it('is false for another type, a non-string value, or no @', () => {
    expect(isPlaceholderEmailIoc({ type: 'domain', value: 'a@test.com' })).toBe(false);
    expect(isPlaceholderEmailIoc({ type: 'email', value: 42 })).toBe(false);
    expect(isPlaceholderEmailIoc({ type: 'email', value: 'test.com' })).toBe(false);
    expect(isPlaceholderEmailIoc({ type: 'email' })).toBe(false);
  });
});
