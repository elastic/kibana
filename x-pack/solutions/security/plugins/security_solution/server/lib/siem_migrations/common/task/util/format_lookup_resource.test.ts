/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatLookupResourcesContext } from './format_lookup_resource';

describe('formatLookupResourcesContext', () => {
  it('should return an empty string for an empty lookup array', () => {
    expect(formatLookupResourcesContext([])).toBe('');
  });

  it('should format a lookup header when lookups have no fields', () => {
    const result = formatLookupResourcesContext([
      { type: 'lookup', name: 'no_fields', content: 'lookup_default_no_fields' },
    ]);

    expect(result).toContain('<lookup_resources>');
    expect(result).toContain(
      '<lookup_resource source_name="no_fields" index="lookup_default_no_fields">'
    );
    expect(result).not.toContain('<fields>');
  });

  it('should format a lookup header when lookups have empty fields', () => {
    const result = formatLookupResourcesContext([
      {
        type: 'lookup',
        name: 'empty_fields',
        content: 'lookup_default_empty_fields',
        fields: [],
      },
    ]);

    expect(result).toContain('<lookup_resources>');
    expect(result).toContain(
      '<lookup_resource source_name="empty_fields" index="lookup_default_empty_fields">'
    );
    expect(result).not.toContain('<fields>');
  });

  it('should return an empty string when lookups have empty content', () => {
    expect(
      formatLookupResourcesContext([
        {
          type: 'lookup',
          name: 'empty_content',
          content: '',
          fields: [{ path: 'ip', type: 'ip' }],
        },
      ])
    ).toBe('');
  });

  it('should format a lookup with content and fields as an XML block', () => {
    const result = formatLookupResourcesContext([
      {
        type: 'lookup',
        name: 'threat_intel_ip',
        content: 'lookup_default_threat_intel_ip',
        fields: [
          { path: 'ip', type: 'ip' },
          { path: 'threat_category', type: 'keyword' },
        ],
      },
    ]);

    expect(result).toContain('<lookup_resources>');
    expect(result).toContain('</lookup_resources>');
    expect(result).toContain(
      '<lookup_resource source_name="threat_intel_ip" index="lookup_default_threat_intel_ip">'
    );
    expect(result).toContain('<field name="ip" type="ip" />');
    expect(result).toContain('<field name="threat_category" type="keyword" />');
  });

  it('should format multiple lookups in a single lookup_resources block', () => {
    const result = formatLookupResourcesContext([
      {
        type: 'lookup',
        name: 'threat_intel_ip',
        content: 'lookup_default_threat_intel_ip',
        fields: [{ path: 'ip', type: 'ip' }],
      },
      {
        type: 'lookup',
        name: 'benign_ips',
        content: 'lookup_default_benign_ips',
        fields: [{ path: 'ip', type: 'ip' }],
      },
    ]);

    expect(result.match(/<lookup_resource /g)).toHaveLength(2);
    expect(result).toContain('source_name="threat_intel_ip"');
    expect(result).toContain('source_name="benign_ips"');
  });

  it('should escape XML-special characters in name, index, and field path/type', () => {
    const result = formatLookupResourcesContext([
      {
        type: 'lookup',
        name: 'a & b <c>',
        content: 'index "x"',
        fields: [{ path: 'field<"weird"', type: 'type & stuff' }],
      },
    ]);

    expect(result).toContain('source_name="a &amp; b &lt;c&gt;"');
    expect(result).toContain('index="index &quot;x&quot;"');
    expect(result).toContain('<field name="field&lt;&quot;weird&quot;" type="type &amp; stuff" />');
  });
});
