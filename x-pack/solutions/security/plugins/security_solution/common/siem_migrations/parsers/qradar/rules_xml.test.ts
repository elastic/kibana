/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QradarRulesXmlParser } from './rules_xml';

const mockRuleDataXml = `<rule buildingBlock="true" enabled="true" id="1220" name="BB:CategoryDefinition: Authentication Success" origin="SYSTEM" owner="admin" roleDefinition="false" scope="LOCAL" type="EVENT">
  <name>BB:CategoryDefinition: Authentication Success</name>
  <notes>Edit this BB to include all events that indicate successful attempts to access the network.</notes>
  <testDefinitions>
    <test group="Event Property Tests" id="21" name="com.q1labs.sem.semces.cre.tests.EventCategory_Test" uid="0">
      <text>when the event category for the event is one of the following &lt;a href='javascript:editParameter("0", "1")' class='dynamic'&gt;Authentication.Admin Login Success Events</text>
      <parameter id="1">
        <initialText>categories</initialText>
        <selectionLabel>Select a category and click 'Add'</selectionLabel>
        <userOptions format="CustomizerParameter-Categories.jsp" method="com.q1labs.sem.ui.servlets.UISemServices.getCategories" multiscreen="true" source="class"/>
        <userSelection>1014, 12-2</userSelection>
        <userSelectionTypes/>
        <userSelectionId>0</userSelectionId>
      </parameter>
    </test>
  </testDefinitions>
  <actions flowAnalysisInterval="0" forceOffenseCreation="true" includeAttackerEventsInterval="0" offenseMapping="0"></actions>
  <responses referenceMap="false" referenceMapOfMaps="false" referenceMapOfMapsRemove="false" referenceMapOfSets="false" referenceMapOfSetsRemove="false" referenceMapRemove="false" referenceTable="false" referenceTableRemove="false">
    <newevent contributeOffenseName="true" credibility="10" describeOffense="true" description="Create an offense" forceOffenseCreation="true" lowLevelCategory="20013" name="Some Offense" offenseMapping="0" overrideOffenseName="false" qid="67555192" relevance="10" ></newevent>
  </responses>
</rule>
`;

const mockRuleDataBase64 = Buffer.from(mockRuleDataXml).toString('base64');

const userXml = `<content>
	<qradarversion>2021.6.12.20250509154206</qradarversion>
	<sensordevice>
		<deviceenabled>true</deviceenabled>
		<creationdate>1719987711695</creationdate>
		<bulk_added_id>0</bulk_added_id>
		<languageid>1</languageid>
		<deployed>true</deployed>
		<timestamp_last_seen>1760692322222</timestamp_last_seen>
		<devicecredibility>5</devicecredibility>
		<uuid>cd27f6e0-a926-4476-b0b6-4ddb268189b5</uuid>
		<hostname>SKDAMBSCXCJTS1</hostname>
		<timestamp_eps60s>2025-10-17T11:12:10.804+02:00</timestamp_eps60s>
		<peakeps60s>0</peakeps60s>
		<eccomponentid>654</eccomponentid>
		<logonly>false</logonly>
		<id>25903</id>
		<devicedescription>WindowsAuthServer device</devicedescription>
		<store_event_payload>true</store_event_payload>
		<parsing_order>1</parsing_order>
		<coalesce_events>true</coalesce_events>
		<eps60s>0</eps60s>
		<autodiscovered>true</autodiscovered>
		<bulk_added>false</bulk_added>
		<encoding>UTF-8</encoding>
		<devicetypeid>12</devicetypeid>
		<sending_ip>172.20.28.21</sending_ip>
		<eccomponentid_history>654</eccomponentid_history>
		<devicename>WindowsAuthServer @ SKDAMBSCXCJTS1</devicename>
		<editdate>1720098231987</editdate>
		<gateway>false</gateway>
		<spconfig>0</spconfig>
	</sensordevice>
	<custom_rule>
		<origin>SYSTEM</origin>
		<mod_date>2025-03-26T16:11:26.275+01:00</mod_date>
    <rule_data>${mockRuleDataBase64}</rule_data>
		<uuid>SYSTEM-1220</uuid>
		<link_uuid>7d9324d4-4c7e-4fb8-99d0-ca8a29377e77</link_uuid>
		<rule_type>0</rule_type>
		<id>1220</id>
		<create_date>2005-12-08T00:36:08.061+01:00</create_date>
	</custom_rule>
</content>
`;

describe('QradarRulesXmlParser', () => {
  describe('getRules', () => {
    it('should correctly parse a valid custom rule from the provided XML', async () => {
      const parser = new QradarRulesXmlParser(userXml);
      const rules = await parser.getRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].title).toBe('BB:CategoryDefinition: Authentication Success');
      expect(rules[0].description).toBe(
        'Edit this BB to include all events that indicate successful attempts to access the network.'
      );
      expect(rules[0].rule_type).toBe('building_block');
      expect(rules[0].rule_data).toBe(mockRuleDataXml);
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
      const parser = new QradarRulesXmlParser(userXml);
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
      const severity = await parser.parseSeverityFromRuleData(mockRuleDataXml);
      expect(severity).toBeUndefined();
    });
  });
});
