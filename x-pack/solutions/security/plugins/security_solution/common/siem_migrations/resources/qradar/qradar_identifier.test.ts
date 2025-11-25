/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { qradarResourceIdentifier } from './qradar_identifier';

describe('qradarResourceIdentifier', () => {
  it('should extract a single reference set name', async () => {
    const ruleDataWithRefSet = `
      <rule>
        <testDefinitions>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
            <text>when the event IP is contained in any of Blocked IPs</text>
          </test>
        </testDefinitions>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataWithRefSet);
    expect(result).toEqual([{ type: 'lookup', name: 'Blocked IPs' }]);
  });

  it('should extract multiple reference set names from one test', async () => {
    const ruleDataWithRefSets = `
      <rule>
        <testDefinitions>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
            <text>when the event IP&lt;/a>is contained in any&lt;/a> of IP List 1, IP List 2, Suspicious IPs</text>
          </test>
        </testDefinitions>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataWithRefSets);
    expect(result).toEqual([
      { type: 'lookup', name: 'IP List 1' },
      { type: 'lookup', name: 'IP List 2' },
      { type: 'lookup', name: 'Suspicious IPs' },
    ]);
  });

  it('should extract reference sets from multiple tests', async () => {
    const ruleDataWithMultipleTests = `
      <rule>
        <testDefinitions>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
            <text>when the event IP is contained in any of List A</text>
          </test>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
            <text>when the event IP is contained in all of List B, List C</text>
          </test>
        </testDefinitions>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataWithMultipleTests);
    expect(result).toEqual([
      { type: 'lookup', name: 'List A' },
      { type: 'lookup', name: 'List B' },
      { type: 'lookup', name: 'List C' },
    ]);
  });

  it('should handle "contained in all of" pattern', async () => {
    const ruleDataWithAllOf = `
      <rule>
        <testDefinitions>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
            <text>when the event IP is contained in all of Required List 1, Required List 2</text>
          </test>
        </testDefinitions>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataWithAllOf);
    expect(result).toEqual([
      { type: 'lookup', name: 'Required List 1' },
      { type: 'lookup', name: 'Required List 2' },
    ]);
  });

  it('should return unique reference set names only', async () => {
    const ruleDataWithDuplicates = `
      <rule>
        <testDefinitions>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
            <text>when the event IP is contained in any of Duplicate List, Unique List</text>
          </test>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
            <text>when the event IP is contained in any of Duplicate List, Another List</text>
          </test>
        </testDefinitions>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataWithDuplicates);
    expect(result).toEqual([
      { type: 'lookup', name: 'Duplicate List' },
      { type: 'lookup', name: 'Unique List' },
      { type: 'lookup', name: 'Another List' },
    ]);
  });

  it('should ignore non-ReferenceSetTest tests', async () => {
    const ruleDataWithMixedTests = `
      <rule>
        <testDefinitions>
          <test name="com.q1labs.sem.semces.cre.tests.EventCategory_Test">
            <text>when the event category is contained in any of Authentication</text>
          </test>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
            <text>when the event IP is contained in any of Valid List</text>
          </test>
        </testDefinitions>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataWithMixedTests);
    expect(result).toEqual([{ type: 'lookup', name: 'Valid List' }]);
  });

  it('should return empty array when no reference set tests are present', async () => {
    const ruleDataNoRefSets = `
      <rule>
        <testDefinitions>
          <test name="com.q1labs.sem.semces.cre.tests.EventCategory_Test">
            <text>when the event category is one of Authentication</text>
          </test>
        </testDefinitions>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataNoRefSets);
    expect(result).toEqual([]);
  });

  it('should handle reference set names with special characters', async () => {
    const ruleDataWithSpecialChars = `
      <rule>
        <testDefinitions>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
            <text>when the event IP is contained in any of IP-List_2024, Blocked.IPs</text>
          </test>
        </testDefinitions>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataWithSpecialChars);
    expect(result).toEqual([
      { type: 'lookup', name: 'IP-List_2024' },
      { type: 'lookup', name: 'Blocked.IPs' },
    ]);
  });

  it('should return empty array if text element is missing', async () => {
    const ruleDataNoText = `
      <rule>
        <testDefinitions>
          <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
          </test>
        </testDefinitions>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataNoText);
    expect(result).toEqual([]);
  });

  it('should throw if XML parsing fails', async () => {
    const invalidXml = 'this is not valid XML <unclosed>';

    await expect(qradarResourceIdentifier(invalidXml)).rejects.toThrow();
  });

  it('should handle nested test definitions', async () => {
    const ruleDataNested = `
      <rule>
        <responses>
          <response>
            <testDefinitions>
              <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
                <text>when the event IP is contained in any of Nested List</text>
              </test>
            </testDefinitions>
          </response>
        </responses>
      </rule>
    `;

    const result = await qradarResourceIdentifier(ruleDataNested);
    expect(result).toEqual([{ type: 'lookup', name: 'Nested List' }]);
  });

  it('should handle empty input', async () => {
    const result = await qradarResourceIdentifier('');
    expect(result).toEqual([]);
  });
});
