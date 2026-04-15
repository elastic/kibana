/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const getRandomNumberId = () => Math.floor(Math.random() * 1000000);

const getMockQRadarRuleDataXml = (ruleName: string, isBuildingBlock: boolean = false) => {
  const id = getRandomNumberId();
  const name = isBuildingBlock ? `BB:${ruleName}` : ruleName;
  return {
    normal: `<rule buildingBlock="${isBuildingBlock}" enabled="true" id="${id}" name="${name}" origin="SYSTEM" owner="admin" roleDefinition="false" scope="LOCAL" type="EVENT">
  <name>${ruleName}</name>
  <notes>Edit this BB to include all events that indicate successful attempts to access the network.</notes>
  <testDefinitions>
    <test group="Event Property Tests" id="21" name="com.q1labs.sem.semces.cre.tests.EventCategory_Test" uid="0">
      <text>when the event category&lt;a href='javascript:editParameter("0", "1")' class='dynamic'> for the event is one of the following &lt;a href='javascript:editParameter("0", "1")' class='dynamic'&gt;Authentication.Admin Login Success Events</text>
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
`,
    sanitized: `<rule buildingBlock="${isBuildingBlock}" enabled="true" id="${id}" name="${name}" origin="SYSTEM" owner="admin" roleDefinition="false" scope="LOCAL" type="EVENT">
  <name>${ruleName}</name>
  <notes>Edit this BB to include all events that indicate successful attempts to access the network.</notes>
  <testDefinitions>
    <test group="Event Property Tests" id="21" name="com.q1labs.sem.semces.cre.tests.EventCategory_Test" uid="0">
      <text>when the event category for the event is one of the following Authentication.Admin Login Success Events</text>
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
`,
  };
};

export const getMockQRadarXml = (ruleNames: string[], isBuildingBlock: boolean = false) => {
  const mockRuleDataXmls = ruleNames.map((ruleName) =>
    getMockQRadarRuleDataXml(ruleName, isBuildingBlock)
  );
  const mockRuleDataBase64s = mockRuleDataXmls.map((mockRuleDataXml) =>
    Buffer.from(mockRuleDataXml.normal).toString('base64')
  );
  return {
    mockQradarXml: `<content>
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
                ${mockRuleDataBase64s
                  .map(
                    (mockRuleDataBase64) => `
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
                `
                  )
                  .join('\n')}
          </content> `,
    mockRuleDataBase64s,
    mockRuleDataXmls: mockRuleDataXmls.map((data) => data.normal),
    mockRuleDataXmlsSanitized: mockRuleDataXmls.map((data) => data.sanitized),
  };
};
