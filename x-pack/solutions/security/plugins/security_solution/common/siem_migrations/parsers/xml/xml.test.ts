/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XmlElement } from './xml';
import { XmlParser } from './xml';

class TestXmlParser extends XmlParser {
  public transformAllDeepPublic(
    source: unknown,
    elementName: string,
    transform: (value: unknown) => unknown
  ): void {
    this.transformAllDeep(source, elementName, transform);
  }
}

describe('XML Parsing', () => {
  describe('findDeep Method', () => {
    it('should find elements by name', async () => {
      const xmlString = `
        <root>
          <child attr1="attrValue"><![CDATA[{ "someJSON":"someValue"}]]></child>
          <child>Value2</child>
        </root>
      `;
      const parser = new XmlParser(xmlString);
      const root = await parser.parse();
      const result = parser.findDeep(root, 'child');
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);

      expect(result).toMatchObject([
        { _: '{ "someJSON":"someValue"}', $: { attr1: 'attrValue' } },
        'Value2',
      ]);
    });
  });

  describe('getStrValue', () => {
    it('should get string value from element', async () => {
      const xmlString = `
        <root>
          <child attr1="attrValue"><![CDATA[{ "someJSON":"someValue"}]]></child>
          <child>Value2</child>
        </root>
      `;
      const parser = new XmlParser(xmlString);
      const root = await parser.parse();
      const childElements = parser.findDeep(root, 'child') as XmlElement[];

      // @ts-ignore testing protected method
      expect(parser.getStrValue(childElements[0])).toBe('{ "someJSON":"someValue"}');
      // @ts-ignore testing protected method
      expect(parser.getStrValue(childElements[1])).toBe('Value2');
    });
  });

  describe('transformAllDeep', () => {
    it('should transform all matching keys across nested objects and arrays', () => {
      const parser = new TestXmlParser();
      const parsedXml = {
        rule: {
          text: ['first'],
          testDefinitions: [
            {
              test: [
                { text: ['second'] },
                { text: [{ _: 'third', $: { attr: 'value' } }] },
                { name: ['no text'] },
              ],
            },
          ],
        },
      };
      const originalRuleReference = parsedXml.rule;

      parser.transformAllDeepPublic(parsedXml, 'text', () => 'sanitized');

      expect(parsedXml.rule).toBe(originalRuleReference);
      expect(parsedXml.rule.text).toEqual('sanitized');
      expect(parsedXml.rule.testDefinitions[0].test[0].text).toEqual('sanitized');
      expect(parsedXml.rule.testDefinitions[0].test[1].text).toEqual('sanitized');
      expect(parsedXml.rule.testDefinitions[0].test[2].name).toEqual(['no text']);
    });
  });
});
