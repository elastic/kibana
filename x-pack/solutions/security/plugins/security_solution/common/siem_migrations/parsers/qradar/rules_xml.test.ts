/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QradarRulesXmlParser } from './rules_xml';
import { getMockQRadarXml } from './mock/data';

const RULE_NAME = 'BB:CategoryDefinition: Authentication Success';
const isBuildingBlockRule = true;
const {
  mockQradarXml,
  mockRuleDataBase64s: _,
  mockRuleDataXmls,
  mockRuleDataXmlsSanitized,
} = getMockQRadarXml([RULE_NAME], isBuildingBlockRule);

describe('QradarRulesXmlParser', () => {
  describe('getRules', () => {
    it('should correctly parse a valid custom rule from the provided XML', async () => {
      const parser = new QradarRulesXmlParser(mockQradarXml);
      const rules = await parser.getRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].title).toBe('BB:CategoryDefinition: Authentication Success');
      expect(rules[0].description).toBe(
        'Edit this BB to include all events that indicate successful attempts to access the network.'
      );
      expect(rules[0].rule_type).toBe('building_block');
      expect(rules[0].rule_data).toBe(mockRuleDataXmlsSanitized[0]);
    });

    it('should return an empty array if no custom rules are found', async () => {
      const xml = '<content><qradarversion>1.0</qradarversion></content>';
      const parser = new QradarRulesXmlParser(xml);
      const rules = await parser.getRules();
      expect(rules).toHaveLength(0);
    });

    it('should correctly identify a rule as "custom_rule" if buildingBlock is not true', async () => {
      const ruleData = `<rule buildingBlock="false"><name>Test Rule</name><notes>Test notes</notes></rule>`;
      const ruleDataBase64 = Buffer.from(ruleData).toString('base64');
      const xml = `<content><custom_rule><rule_data>${ruleDataBase64}</rule_data></custom_rule></content>`;
      const parser = new QradarRulesXmlParser(xml);
      const rules = await parser.getRules();

      expect(rules[0].rule_type).toBe('default');
    });

    it('should skip rules that are missing a title (name)', async () => {
      const ruleData = `<rule><notes>Some notes</notes></rule>`;
      const ruleDataBase64 = Buffer.from(ruleData).toString('base64');
      const xml = `<content><custom_rule><rule_data>${ruleDataBase64}</rule_data></custom_rule></content>`;
      const parser = new QradarRulesXmlParser(xml);
      const rules = await parser.getRules();
      expect(rules).toHaveLength(0);
    });

    it('should skip rules that are missing a description (notes)', async () => {
      const ruleData = `<rule><name>A name</name></rule>`;
      const ruleDataBase64 = Buffer.from(ruleData).toString('base64');
      const xml = `<content><custom_rule><rule_data>${ruleDataBase64}</rule_data></custom_rule></content>`;
      const parser = new QradarRulesXmlParser(xml);
      const rules = await parser.getRules();
      expect(rules).toHaveLength(0);
    });

    it('should sanitize HTML content within text tags in rule_data', async () => {
      const ruleDataWithHtml = `<rule buildingBlock="false">
  <name>Test Rule</name>
  <notes>Test notes</notes>
  <testDefinitions>
    <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
      <text>when &lt;a href='javascript:editParameter("1", "1")'&gt;any&lt;/a&gt; of &lt;a&gt;Source IP&lt;/a&gt; are contained in &lt;a&gt;any&lt;/a&gt; of &lt;a&gt;Blocked IPs - IP&lt;/a&gt;</text>
    </test>
  </testDefinitions>
</rule>`;
      const ruleDataBase64 = Buffer.from(ruleDataWithHtml).toString('base64');
      const xml = `<content><custom_rule><rule_data>${ruleDataBase64}</rule_data></custom_rule></content>`;
      const parser = new QradarRulesXmlParser(xml);
      const rules = await parser.getRules();

      expect(rules).toHaveLength(1);
      // The rule_data should have sanitized text content (HTML entities decoded, tags removed)
      expect(rules[0].rule_data).toContain(
        '<text>when any of Source IP are contained in any of Blocked IPs - IP</text>'
      );
      // Should NOT contain the original HTML entities
      expect(rules[0].rule_data).not.toContain('&lt;');
      expect(rules[0].rule_data).not.toContain('&gt;');
    });
  });

  describe('getResources', () => {
    it('should return an empty array for sensordevicetype when not present', async () => {
      const parser = new QradarRulesXmlParser(mockQradarXml);
      const resources = await parser.getResources();
      expect(resources.sensordevicetype).toEqual([]);
    });

    it('should correctly parse sensordevicetype when present', async () => {
      const sensorTypeXml = `
        <content>
          <sensordevicetype>
            <devicetypename>IBMAIXServer</devicetypename>
            <devicetypedescription>IBM AIX Server</devicetypedescription>
            <id>85</id>
          </sensordevicetype>
          <sensordevicetype>
            <devicetypename>AnotherDevice</devicetypename>
            <devicetypedescription>Another Device Description</devicetypedescription>
            <id>86</id>
          </sensordevicetype>
        </content>
      `;
      const parser = new QradarRulesXmlParser(sensorTypeXml);
      const resources = await parser.getResources();
      const deviceTypes = resources.sensordevicetype;

      expect(deviceTypes).toHaveLength(2);
      expect(deviceTypes?.[0].name).toBe('IBMAIXServer');
      expect(deviceTypes?.[0].description).toBe('IBM AIX Server');
      expect(JSON.parse(deviceTypes?.[0].content ?? '{}')).toHaveProperty('id', ['85']);
      expect(deviceTypes?.[1].name).toBe('AnotherDevice');
      expect(deviceTypes?.[1].description).toBe('Another Device Description');
      expect(JSON.parse(deviceTypes?.[1].content ?? '{}')).toHaveProperty('id', ['86']);
    });
  });

  describe('parseSeverityFromRuleData', () => {
    it('should extract severity when present', async () => {
      const ruleDataWithSeverity = `
        <rule>
          <responses>
            <response>
              <newevent name="New Event" severity="8" sendToAriel="true"/>
            </response>
          </responses>
        </rule>
      `;
      const parser = new QradarRulesXmlParser();
      const severity = await parser.parseSeverityFromRuleData(ruleDataWithSeverity);
      expect(severity).toBe('8');
    });

    it('should return undefined if severity is not present', async () => {
      const parser = new QradarRulesXmlParser('');
      const severity = await parser.parseSeverityFromRuleData(mockRuleDataXmls[0]);
      expect(severity).toBeUndefined();
    });
  });

  describe('extractReferenceSets', () => {
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
      const parser = new QradarRulesXmlParser('');
      const refSets = await parser.getReferenceSetsFromRuleData(ruleDataWithRefSet);
      expect(refSets).toEqual(['Blocked IPs']);
    });

    it('should extract multiple reference set names from one test', async () => {
      const ruleDataWithRefSets = `
        <rule>
          <testDefinitions>
            <test name="com.q1labs.semsources.cre.tests.ReferenceSetTest">
              <text>when the event IP is contained in any of IP List 1, IP List 2, Suspicious IPs</text>
            </test>
          </testDefinitions>
        </rule>
      `;
      const parser = new QradarRulesXmlParser('');
      const refSets = await parser.getReferenceSetsFromRuleData(ruleDataWithRefSets);
      expect(refSets).toEqual(['IP List 1', 'IP List 2', 'Suspicious IPs']);
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
      const parser = new QradarRulesXmlParser('');
      const refSets = await parser.getReferenceSetsFromRuleData(ruleDataWithMultipleTests);
      expect(refSets).toEqual(['List A', 'List B', 'List C']);
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
      const parser = new QradarRulesXmlParser('');
      const refSets = await parser.getReferenceSetsFromRuleData(ruleDataWithAllOf);
      expect(refSets).toEqual(['Required List 1', 'Required List 2']);
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
      const parser = new QradarRulesXmlParser('');
      const refSets = await parser.getReferenceSetsFromRuleData(ruleDataWithDuplicates);
      expect(refSets).toEqual(['Duplicate List', 'Unique List', 'Another List']);
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
      const parser = new QradarRulesXmlParser('');
      const refSets = await parser.getReferenceSetsFromRuleData(ruleDataWithMixedTests);
      expect(refSets).toEqual(['Valid List']);
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
      const parser = new QradarRulesXmlParser('');
      const refSets = await parser.getReferenceSetsFromRuleData(ruleDataNoRefSets);
      expect(refSets).toEqual([]);
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
      const parser = new QradarRulesXmlParser('');
      const refSets = await parser.getReferenceSetsFromRuleData(ruleDataWithSpecialChars);
      expect(refSets).toEqual(['IP-List_2024', 'Blocked.IPs']);
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
      const parser = new QradarRulesXmlParser('');
      const refSets = await parser.getReferenceSetsFromRuleData(ruleDataNoText);
      expect(refSets).toEqual([]);
    });
  });
});
