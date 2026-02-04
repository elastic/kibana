/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import xml2js from 'xml2js';

export interface BaseXmlElement {
  $?: { [key: string]: string }; // XML attributes
  _?: string; // Text content
}

export interface XmlElement extends BaseXmlElement {
  [key: string]: XmlElement | XmlElement[] | string | undefined;
}

export class XmlParser {
  constructor(private readonly xml?: string) {}

  public async parse(): Promise<XmlElement> {
    if (!this.xml) {
      throw new Error('No XML content to parse');
    }
    return xml2js.parseStringPromise(this.xml, {
      explicitArray: true,
    }) as Promise<XmlElement>;
  }

  protected findAllDeep(source: XmlElement, elementName: string): XmlElement[] {
    const results: XmlElement[] = [];

    if (typeof source !== 'object' || source === null) {
      return results;
    }

    if (elementName in source) {
      const element = source[elementName];

      if (Array.isArray(element)) {
        results.push(...element);
      } else if (element) {
        results.push(element as XmlElement);
      }
    }

    // Search recursively in all properties (but skip children of found elements)
    for (const key of Object.keys(source)) {
      if (key === elementName) {
        // Skip the element we already processed above
      } else {
        const value = source[key];

        if (Array.isArray(value)) {
          for (const item of value) {
            const childResults = this.findAllDeep(item, elementName);
            results.push(...childResults);
          }
        } else if (typeof value === 'object' && value !== null) {
          const childResults = this.findAllDeep(value, elementName);
          results.push(...childResults);
        }
      }
    }

    return results;
  }

  /** Unified deep search method (equivalent to XML's .// XPath expressions) */
  public findDeep(
    source: XmlElement,
    elementName: string,
    attrName?: string,
    attrValue?: string
  ): Array<XmlElement> | XmlElement | string | undefined {
    if (typeof source !== 'object' || source === null) {
      return undefined;
    }
    // Check if the element exists at this level
    if (elementName in source) {
      const element = source[elementName];

      // If no attribute filtering is needed, return the element
      if (!attrName || !attrValue) {
        return element;
      }

      // If attribute filtering is needed, check if it's an array of elements
      if (Array.isArray(element)) {
        for (const item of element as XmlElement[]) {
          if (item.$ && item.$[attrName] === attrValue) {
            return item;
          }
        }
      }
    }

    for (const key of Object.keys(source)) {
      const value = source[key];

      if (Array.isArray(value)) {
        for (const item of value) {
          const result = this.findDeep(item, elementName, attrName, attrValue);
          if (result !== undefined) {
            return result;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = this.findDeep(value, elementName, attrName, attrValue);
        if (result !== undefined) {
          return result;
        }
      }
    }

    return undefined;
  }

  public findDeepValue(
    source: XmlElement,
    elementName: string,
    attrName: string
  ): string | undefined {
    if (typeof source !== 'object' || source === null) {
      return undefined;
    }

    const el = this.findDeep(source, elementName);

    // If attribute filtering is needed, check if it's an array of elements
    if (Array.isArray(el)) {
      for (const item of el) {
        return item.$ && attrName in item.$ ? item.$[attrName] : undefined;
      }
    } else if (typeof el === 'object' && el !== null) {
      return el.$ && attrName in el.$ ? el.$[attrName] : undefined;
    }

    return undefined;
  }

  protected getStrValue(val: BaseXmlElement | Array<string> | string): string {
    if (this.isBaseXmlElement(val)) {
      return val._ ? val._.trim() : '';
    }

    if (Array.isArray(val)) {
      return val[0].trim();
    }

    return val.trim();
  }

  private isBaseXmlElement(obj: unknown): obj is BaseXmlElement {
    return Boolean(obj && typeof obj === 'object' && ('_' in obj || '$' in obj));
  }
}
