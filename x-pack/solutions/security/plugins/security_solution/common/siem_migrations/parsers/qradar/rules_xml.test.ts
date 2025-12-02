/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QradarRulesXmlParser } from './rules_xml';
import { getMockQRadarXml } from './mock/data';

const RULE_NAME = 'BB:CategoryDefinition: Authentication Success';

const { mockQradarXml, mockRuleDataBase64s: _, mockRuleDataXmls } = getMockQRadarXml([RULE_NAME]);

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
      expect(rules[0].rule_data).toBe(mockRuleDataXmls[0]);
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
      const parser = new QradarRulesXmlParser('');
      const severity = await parser.parseSeverityFromRuleData(ruleDataWithSeverity);
      expect(severity).toBe('8');
    });

    it('should return undefined if severity is not present', async () => {
      const parser = new QradarRulesXmlParser('');
      const severity = await parser.parseSeverityFromRuleData(mockRuleDataXmls[0]);
      expect(severity).toBeUndefined();
    });
  });
});
