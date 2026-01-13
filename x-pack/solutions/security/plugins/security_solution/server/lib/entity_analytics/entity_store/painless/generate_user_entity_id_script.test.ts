/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateUserEntityIdScript } from './generate_user_entity_id_script';

describe('generateUserEntityIdScript', () => {
  it('should generate a valid Painless script', () => {
    const script = generateUserEntityIdScript();
    expect(script).toBeTruthy();
    expect(typeof script).toBe('string');
  });

  it('should include all ranking fields', () => {
    const script = generateUserEntityIdScript();

    // Check that all fields are present in the script
    expect(script).toContain('user.entity.id');
    expect(script).toContain('user.name');
    expect(script).toContain('user.id');
    expect(script).toContain('user.email');
    expect(script).toContain('user.domain');
    expect(script).toContain('host.entity.id');
    expect(script).toContain('host.id');
    expect(script).toContain('host.name');
  });

  it('should prioritize user.entity.id first', () => {
    const script = generateUserEntityIdScript();
    const entityIdEmit = script.indexOf("emit(doc['user.entity.id'].value)");
    const userNameHostEmit = script.indexOf("doc['user.name'].value + '@'");

    expect(entityIdEmit).toBeLessThan(userNameHostEmit);
  });

  it('should prioritize user.name @ host.entity.id second', () => {
    const script = generateUserEntityIdScript();
    const hostEntityIdCombo = script.indexOf("doc['host.entity.id'].value); return;");
    const hostIdCombo = script.indexOf("doc['host.id'].value); return;");

    // host.entity.id combination should come before host.id combination
    expect(hostEntityIdCombo).toBeLessThan(hostIdCombo);
  });

  it('should prioritize user.name @ host.id third', () => {
    const script = generateUserEntityIdScript();
    const hostIdCombo = script.indexOf("doc['host.id'].value); return;");
    const hostNameCombo = script.indexOf("doc['host.name'].value); return;");

    // host.id combination should come before host.name combination
    expect(hostIdCombo).toBeLessThan(hostNameCombo);
  });

  it('should prioritize user.id fifth, before user.email', () => {
    const script = generateUserEntityIdScript();
    const userIdEmit = script.indexOf("emit(doc['user.id'].value); return;");
    const userEmailEmit = script.indexOf("emit(doc['user.email'].value); return;");

    expect(userIdEmit).toBeLessThan(userEmailEmit);
  });

  it('should prioritize user.email sixth, before user.name @ user.domain', () => {
    const script = generateUserEntityIdScript();
    const userEmailEmit = script.indexOf("emit(doc['user.email'].value); return;");
    const userDomainCombo = script.indexOf("doc['user.domain'].value); return;");

    expect(userEmailEmit).toBeLessThan(userDomainCombo);
  });

  it('should combine user.name with host fields using @ separator', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain("doc['user.name'].value + '@' + doc['host.entity.id'].value");
    expect(script).toContain("doc['user.name'].value + '@' + doc['host.id'].value");
    expect(script).toContain("doc['user.name'].value + '@' + doc['host.name'].value");
  });

  it('should combine user.name with user.domain using @ separator', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain("doc['user.name'].value + '@' + doc['user.domain'].value");
  });

  it('should emit user.name as lowest priority fallback', () => {
    const script = generateUserEntityIdScript();

    // user.name should be the last emit before empty string
    const userNameAloneEmit = script.lastIndexOf("emit(doc['user.name'].value); return;");
    const emptyFallback = script.indexOf("emit('')");

    expect(userNameAloneEmit).toBeLessThan(emptyFallback);
  });

  it('should emit empty string as final fallback', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain("emit('')");
  });

  it('should use emit() and return for runtime fields', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain('emit(');
    expect(script).toContain('return;');
  });

  it('should include isValid helper function for field validation', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain('boolean isValid(def doc, String field)');
    expect(script).toContain('doc.containsKey(field)');
    expect(script).toContain('doc[field].empty');
  });

  it('should filter invalid values in isValid helper', () => {
    const script = generateUserEntityIdScript();

    // Check that invalid value filtering is present
    expect(script).toContain("v != ''");
    expect(script).toContain("v != '-'");
    expect(script).toContain("v != 'unknown'");
    expect(script).toContain("v != 'n/a'");
  });

  it('should convert values to lowercase for invalid value comparison', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain('.toLowerCase()');
  });

  it('should use isValid helper for all field checks', () => {
    const script = generateUserEntityIdScript();

    // All field checks should use isValid
    expect(script).toContain("isValid(doc, 'user.entity.id')");
    expect(script).toContain("isValid(doc, 'user.name')");
    expect(script).toContain("isValid(doc, 'user.id')");
    expect(script).toContain("isValid(doc, 'user.email')");
    expect(script).toContain("isValid(doc, 'user.domain')");
    expect(script).toContain("isValid(doc, 'host.entity.id')");
    expect(script).toContain("isValid(doc, 'host.id')");
    expect(script).toContain("isValid(doc, 'host.name')");
  });
});
