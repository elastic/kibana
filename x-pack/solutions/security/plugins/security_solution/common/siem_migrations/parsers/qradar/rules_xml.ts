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
      // Sanitize HTML content within <text> tags
      decodedRuleData = this.sanitizeTextTagsInRuleData(decodedRuleData);
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
      const description = this.getStrValue(notes);
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

  public async getResources(): Promise<Partial<ResourceTypeMap>> {
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

  /**
   * Sanitizes text content by decoding HTML entities and removing HTML tags.
   * QRadar rule text elements can contain HTML like:
   * `when &lt;a href='javascript:...'&gt;any&lt;/a&gt; of &lt;a&gt;Reference Set Name&lt;/a&gt;`
   *
   * This method converts it to plain text:
   * `when any of Reference Set Name`
   *
   * @param text - The text content that may contain HTML entities and tags
   * @returns Sanitized plain text
   */
  private sanitizeHtmlText(text: string): string {
    // First, decode common HTML entities
    let decoded = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");

    // Remove all HTML tags and keep only the text content
    // This regex matches opening tags, closing tags, and self-closing tags
    decoded = decoded.replace(/<[^>]*>/g, '');

    // Clean up any extra whitespace that might result from tag removal
    decoded = decoded.replace(/\s+/g, ' ').trim();

    return decoded;
  }

  /**
   * Sanitizes the content within <text> tags in the rule data XML.
   * This cleans up HTML entities and tags within test text elements
   * so the stored rule_data is clean.
   *
   * @param ruleData - The decoded XML rule data string
   * @returns The rule data with sanitized text content
   */
  private sanitizeTextTagsInRuleData(ruleData: string): string {
    // Find all <text>...</text> patterns and sanitize their content
    return ruleData.replace(/<text>([\s\S]*?)<\/text>/g, (match, content) => {
      const sanitizedContent = this.sanitizeHtmlText(content);
      return `<text>${sanitizedContent}</text>`;
    });
  }

  /**
   * Extracts the reference set name from a "Name - Type" format.
   * QRadar reference set names can include a type suffix like "AlphaNumeric" or "IP".
   * For example: "FireEye Whitelists - AlphaNumeric" -> "FireEye Whitelists"
   *
   * If no " - " separator is found, returns the original name.
   *
   * @param fullName - The full reference set name that may include type suffix
   * @returns The reference set name without the type suffix
   */
  private extractReferenceSetName(fullName: string): string {
    // Split by " - " (space-dash-space) to separate name from type
    const separatorIndex = fullName.lastIndexOf(' - ');
    if (separatorIndex === -1) {
      // No separator found, return the full name
      return fullName;
    }

    // Return the name part (everything before the last " - ")
    return fullName.substring(0, separatorIndex).trim();
  }

  /**
   * Extracts reference set names from QRadar rule data XML.
   * Reference sets are identified by ReferenceSetTest tests, and their names
   * are extracted from text patterns like "contained in any of Name1, Name2"
   * or "contained in all of Name1, Name2".
   *
   * @param ruleData - The decoded XML rule data string
   * @returns Array of unique reference set names found in the rule
   */
  public async getReferenceSetsFromRuleData(ruleData: string): Promise<string[]> {
    const parsedRuleData = await this.parseRuleData(ruleData);

    // Find all test elements in the rule data
    const tests = this.findAllDeep(parsedRuleData, 'test');

    const referenceSetNames: string[] = [];

    for (const test of tests) {
      // Check if this is a ReferenceSetTest by looking at the 'name' attribute
      const testName = test.$?.name;
      if (testName === 'com.q1labs.semsources.cre.tests.ReferenceSetTest') {
        // Extract the text element which contains the reference set names
        const textElement = this.findDeep(test, 'text');

        if (textElement) {
          const rawTextContent = this.getStrValue(textElement as Array<string> | string);
          // Sanitize the text content to remove HTML tags and decode entities
          const textContent = this.sanitizeHtmlText(rawTextContent);

          // Parse the pattern: "contained in any/all of Name1, Name2, Name3"
          // The pattern can be either "contained in any of" or "contained in all of"
          const match = textContent.match(/contained in (?:any|all).* of (.+)/);

          if (match && match[1]) {
            // Split by comma, clean up each name, and extract the reference set name
            // (removing type suffix like "- AlphaNumeric" or "- IP")
            const names = match[1]
              .split(',')
              .map((name) => name.trim())
              .filter((name) => name.length > 0)
              .map((name) => this.extractReferenceSetName(name));

            referenceSetNames.push(...names);
          }
        }
      }
    }

    // Return unique names only
    return [...new Set(referenceSetNames)];
  }
}
