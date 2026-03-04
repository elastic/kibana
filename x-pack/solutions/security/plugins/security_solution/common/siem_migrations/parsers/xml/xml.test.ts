/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XmlElement } from './xml';
import { XmlParser } from './xml';

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
});
