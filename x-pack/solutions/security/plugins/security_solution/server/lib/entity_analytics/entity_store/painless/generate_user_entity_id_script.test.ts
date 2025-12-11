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

  it('should include all ranking checks in the correct order', () => {
    const script = generateUserEntityIdScript();

    // Check that all fields are present in the script
    expect(script).toContain('user.entity.id');
    expect(script).toContain('user.email');
    expect(script).toContain('user.name');
    expect(script).toContain('user.id');
    expect(script).toContain('host.id');
    expect(script).toContain('host.name');
    expect(script).toContain('host.hostname');
    expect(script).toContain('host.mac');
    expect(script).toContain('host.ip');
  });

  it('should prioritize user.entity.id first', () => {
    const script = generateUserEntityIdScript();
    const entityIdIndex = script.indexOf('user.entity.id');
    const emailIndex = script.indexOf("doc['user.email']");

    expect(entityIdIndex).toBeLessThan(emailIndex);
  });

  it('should prioritize user.email second', () => {
    const script = generateUserEntityIdScript();
    const emailIndex = script.indexOf("emit(doc['user.email'].value)");
    const userNameHostComboIndex = script.indexOf("doc['user.name'].value + '@' + h");

    // Email check should come before user.name@host combinations
    expect(emailIndex).toBeLessThan(userNameHostComboIndex);
  });

  it('should combine user.name with host identity using @ separator', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain("doc['user.name'].value + '@' + h");
  });

  it('should combine user.id with host identity using @ separator', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain("doc['user.id'].value + '@' + h");
  });

  it('should determine best host identity', () => {
    const script = generateUserEntityIdScript();

    // Should contain logic to determine host identity
    expect(script).toContain('String h = null');
    expect(script).toContain('host.mac');
    expect(script).toContain('host.id');
    expect(script).toContain('host.name');
    expect(script).toContain('host.hostname');
    expect(script).toContain('host.ip');
  });

  it('should include user.id as fallback before user.name alone', () => {
    const script = generateUserEntityIdScript();

    const userIdIndex = script.indexOf("emit(doc['user.id'].value)");
    const userNameAloneIndex = script.lastIndexOf("emit(doc['user.name'].value)");

    expect(userIdIndex).toBeLessThan(userNameAloneIndex);
  });

  it('should prioritize host identity fields in correct order', () => {
    const script = generateUserEntityIdScript();

    const hostIdIndex = script.indexOf("doc.containsKey('host.id')");
    const hostNameIndex = script.indexOf("doc.containsKey('host.name')");
    const hostHostnameIndex = script.indexOf("doc.containsKey('host.hostname')");
    const hostMacIndex = script.indexOf("doc.containsKey('host.mac')");
    const hostIpIndex = script.indexOf("doc.containsKey('host.ip')");

    expect(hostIdIndex).toBeLessThan(hostNameIndex);
    expect(hostNameIndex).toBeLessThan(hostHostnameIndex);
    expect(hostHostnameIndex).toBeLessThan(hostMacIndex);
    expect(hostMacIndex).toBeLessThan(hostIpIndex);
  });

  it('should emit empty string as final fallback', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain("emit('')");
  });

  it('should use emit() instead of return for runtime fields', () => {
    const script = generateUserEntityIdScript();

    expect(script).toContain('emit(');
    expect(script).toContain('return;');
  });

  it('should use proper field existence checks', () => {
    const script = generateUserEntityIdScript();

    // The script should contain field existence checks
    expect(script).toContain('doc.containsKey');
    expect(script).toContain('.empty');
  });

  it('should check host availability before attempting host combinations', () => {
    const script = generateUserEntityIdScript();

    // host check should come before any @ combinations
    const hostCheckIndex = script.indexOf('if (h != null)');
    const firstHostCombinationIndex = script.indexOf("+ '@' + h");

    expect(hostCheckIndex).toBeLessThan(firstHostCombinationIndex);
  });
});
