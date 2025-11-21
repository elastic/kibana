/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import xml2js from 'xml2js';
import type { XmlElement } from '../xml/xml';
import { XmlParser } from '../xml/xml';
import type { QradarRule, ResourceDetailType, ResourceTypeMap } from './types';

export class QradarRulesXmlParser extends XmlParser {
  private async processRuleXml(qradarRule: XmlElement): Promise<QradarRule | undefined> {
    const ruleData = this.getStrValue(
      this.findDeep(qradarRule, 'rule_data') as string | Array<string>
    );
    let decodedRuleData: string;
    try {
      decodedRuleData = Buffer.from(ruleData, 'base64').toString('utf-8');
    } catch (error) {
      throw new Error(`Failed to decode rule_data from base64: ${error.message}`);
    }

    const parsedRuleData = await this.parseRuleData(decodedRuleData);

    const id = this.findDeepValue(parsedRuleData, 'rule', 'id') as string;
    const name = this.findDeep(parsedRuleData, 'name') as string | Array<string>;
    const notes = this.findDeep(parsedRuleData, 'notes') as string | Array<string>;
    const isBuildingBlockVal =
      this.findDeepValue(parsedRuleData, 'rule', 'buildingBlock') ?? 'false';

    if (name && notes && isBuildingBlockVal) {
      const title = this.getStrValue(name);

      const description = this.getStrValue(notes) as string;
      const isBuildingBlock = isBuildingBlockVal === 'true';

      return {
        id: id as string,
        title,
        description,
        rule_type: isBuildingBlock ? 'building_block' : 'default',
        rule_data: decodedRuleData,
      };
    }
  }
  public async getRules(): Promise<QradarRule[]> {
    const parsedXml = await this.parse();
    const rules = this.findDeep(parsedXml, 'custom_rule');
    const qradarRules = Array.isArray(rules) ? rules : [];
    const processQradarRulePromises = qradarRules.map(this.processRuleXml.bind(this));
    const parsedRules = await Promise.all(processQradarRulePromises);
    return parsedRules.filter(Boolean) as QradarRule[];
  }

  private async parseRuleData(ruleData: string): Promise<XmlElement> {
    return xml2js.parseStringPromise(ruleData, {
      explicitArray: true,
    }) as Promise<XmlElement>;
  }

  public async parseSeverityFromRuleData(ruleData: string): Promise<string | undefined> {
    const parsedRuleData = await this.parseRuleData(ruleData);
    return this.findDeepValue(parsedRuleData, 'newevent', 'severity');
  }

  public async getResources(): Promise<ResourceTypeMap> {
    const parsedXml = await this.parse();

    const [sensordevicetypes] = await Promise.all([this.getSensortDeviceType(parsedXml)]);

    return {
      qidmap: undefined,
      reference_data_rules: undefined,
      sensordevicetype: sensordevicetypes,
      sensordeviceprotocols: undefined,
      sensordevicecategory: undefined,
      ariel_property_expression: undefined,
      ariel_regex_property: undefined,
      reference_data: undefined,
      offense_type: undefined,
    };
  }

  private async getSensortDeviceType(parsedXml: XmlElement): Promise<ResourceDetailType[]> {
    const sensordevicetypes = this.findDeep(parsedXml, 'sensordevicetype');

    return (
      (Array.isArray(sensordevicetypes) ? sensordevicetypes : [])?.map((deviceType) => ({
        name: this.getStrValue(deviceType.devicetypename as Array<string> | string),
        description: this.getStrValue(deviceType.devicetypedescription as Array<string> | string),

        content: JSON.stringify(deviceType),
      })) || []
    );
  }

  private getStrValue(val: Array<string> | string): string {
    if (Array.isArray(val)) {
      return val[0].trim();
    }
    return val.trim();
  }
}
