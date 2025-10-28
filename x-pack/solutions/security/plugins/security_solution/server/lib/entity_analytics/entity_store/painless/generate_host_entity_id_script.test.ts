/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateHostEntityIdScript } from './generate_host_entity_id_script';

describe('generateHostEntityIdScript', () => {
  it('should generate a valid Painless script', () => {
    const script = generateHostEntityIdScript();
    expect(script).toBeTruthy();
    expect(typeof script).toBe('string');
  });

  it('should include all ranking checks in the correct order', () => {
    const script = generateHostEntityIdScript();

    // Check that all fields are present in the script
    expect(script).toContain('host.entity.id');
    expect(script).toContain('host.id');
    expect(script).toContain('host.mac');
    expect(script).toContain('host.name');
    expect(script).toContain('host.hostname');
    expect(script).toContain('host.ip');
  });

  it('should prioritize host.entity.id first', () => {
    const script = generateHostEntityIdScript();
    const entityIdIndex = script.indexOf('host.entity.id');
    const hostIdIndex = script.indexOf("doc['host.id']");

    expect(entityIdIndex).toBeLessThan(hostIdIndex);
  });

  it('should use label (host.name or host.hostname) for combinations', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain('String label');
    expect(script).toContain("label = doc['host.name'].value");
    expect(script).toContain("label = doc['host.hostname'].value");
  });

  it('should combine label with host.id using pipe separator', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain("label + '|' + doc['host.id'].value");
  });

  it('should combine label with host.mac using pipe separator', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain("label + '|' + doc['host.mac'].value");
  });

  it('should combine host.name and host.ip with pipe separator', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain("doc['host.name'].value + '|' + doc['host.ip'].value");
  });

  it('should combine host.hostname and host.ip with pipe separator', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain("doc['host.hostname'].value + '|' + doc['host.ip'].value");
  });

  it('should include fallback fields in correct order', () => {
    const script = generateHostEntityIdScript();

    const hostIdIndex = script.indexOf("emit(doc['host.id'].value); return;");
    const hostMacIndex = script.indexOf("emit(doc['host.mac'].value); return;");
    const hostNameIndex = script.indexOf("emit(doc['host.name'].value); return;");
    const hostnameIndex = script.indexOf("emit(doc['host.hostname'].value); return;");
    const ipIndex = script.indexOf("emit(doc['host.ip'].value); return;");

    expect(hostIdIndex).toBeLessThan(hostMacIndex);
    expect(hostMacIndex).toBeLessThan(hostNameIndex);
    expect(hostNameIndex).toBeLessThan(hostnameIndex);
    expect(hostnameIndex).toBeLessThan(ipIndex);
  });

  it('should emit empty string as final fallback', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain("emit('')");
  });

  it('should use emit() instead of return for runtime fields', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain('emit(');
    expect(script).toContain('return;');
  });

  it('should use proper field existence checks', () => {
    const script = generateHostEntityIdScript();

    // The script should contain field existence checks
    expect(script).toContain('doc.containsKey');
    expect(script).toContain('.empty');
  });
});
