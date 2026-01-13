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

  it('should include all ranking fields', () => {
    const script = generateHostEntityIdScript();

    // Check that all fields are present in the script
    expect(script).toContain('host.entity.id');
    expect(script).toContain('host.id');
    expect(script).toContain('host.name');
    expect(script).toContain('host.hostname');
    expect(script).toContain('host.domain');
  });

  it('should prioritize host.entity.id first', () => {
    const script = generateHostEntityIdScript();
    const entityIdEmit = script.indexOf("emit(doc['host.entity.id'].value)");
    const hostIdEmit = script.indexOf("emit(doc['host.id'].value)");

    expect(entityIdEmit).toBeLessThan(hostIdEmit);
  });

  it('should prioritize host.id second', () => {
    const script = generateHostEntityIdScript();
    const hostIdEmit = script.indexOf("emit(doc['host.id'].value); return;");
    const hostNameDomainCombo = script.indexOf("doc['host.domain'].value); return;");

    expect(hostIdEmit).toBeLessThan(hostNameDomainCombo);
  });

  it('should prioritize host.name . host.domain third', () => {
    const script = generateHostEntityIdScript();
    // Find the first occurrence of host.name combined with host.domain
    const hostNameDomainCombo = script.indexOf(
      "doc['host.name'].value + '.' + doc['host.domain'].value"
    );
    const hostHostnameDomainCombo = script.indexOf(
      "doc['host.hostname'].value + '.' + doc['host.domain'].value"
    );

    expect(hostNameDomainCombo).toBeLessThan(hostHostnameDomainCombo);
  });

  it('should prioritize host.hostname fifth, before host.name alone', () => {
    const script = generateHostEntityIdScript();
    const hostnameEmit = script.indexOf("emit(doc['host.hostname'].value); return;");
    const hostNameEmit = script.lastIndexOf("emit(doc['host.name'].value); return;");

    expect(hostnameEmit).toBeLessThan(hostNameEmit);
  });

  it('should combine host.name with host.domain using dot separator', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain("doc['host.name'].value + '.' + doc['host.domain'].value");
  });

  it('should combine host.hostname with host.domain using dot separator', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain("doc['host.hostname'].value + '.' + doc['host.domain'].value");
  });

  it('should emit host.name as lowest priority fallback', () => {
    const script = generateHostEntityIdScript();

    // host.name alone should be the last emit before empty string
    const hostNameAloneEmit = script.lastIndexOf("emit(doc['host.name'].value); return;");
    const emptyFallback = script.indexOf("emit('')");

    expect(hostNameAloneEmit).toBeLessThan(emptyFallback);
  });

  it('should emit empty string as final fallback', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain("emit('')");
  });

  it('should use emit() and return for runtime fields', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain('emit(');
    expect(script).toContain('return;');
  });

  it('should include isValid helper function for field validation', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain('boolean isValid(def doc, String field)');
    expect(script).toContain('doc.containsKey(field)');
    expect(script).toContain('doc[field].empty');
  });

  it('should filter invalid values in isValid helper', () => {
    const script = generateHostEntityIdScript();

    // Check that invalid value filtering is present
    expect(script).toContain("v != ''");
    expect(script).toContain("v != '-'");
    expect(script).toContain("v != 'unknown'");
    expect(script).toContain("v != 'n/a'");
  });

  it('should convert values to lowercase for invalid value comparison', () => {
    const script = generateHostEntityIdScript();

    expect(script).toContain('.toLowerCase()');
  });

  it('should use isValid helper for all field checks', () => {
    const script = generateHostEntityIdScript();

    // All field checks should use isValid
    expect(script).toContain("isValid(doc, 'host.entity.id')");
    expect(script).toContain("isValid(doc, 'host.id')");
    expect(script).toContain("isValid(doc, 'host.name')");
    expect(script).toContain("isValid(doc, 'host.hostname')");
    expect(script).toContain("isValid(doc, 'host.domain')");
  });
});
