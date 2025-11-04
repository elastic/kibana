/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// stringify an file containing XML and output it to another json file with key xml with the content of the file
//

import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

const INPUT_XML_PATH = resolve(
  '/Users/jatinkathuria/Downloads/Export-to-Elastic/skoda_all_final_Rule-Mitre-Mappings_2025-10-17_1259/custom_rule-20251017130000.xml'
);
const OUTPUT_JSON_PATH = resolve('output.json');

async function stringifyXmlToJson() {
  // Read the XML file
  const xmlContent = await readFile(INPUT_XML_PATH, 'utf-8');

  // Create a JSON object with the XML content
  const jsonObject = {
    xml: xmlContent,
  };

  // Write the JSON object to a file
  await writeFile(OUTPUT_JSON_PATH, JSON.stringify(jsonObject, null, 2), 'utf-8');
}

stringifyXmlToJson()
  .then(() => console.log('XML content has been stringified to JSON successfully.'))
  .catch((error) => console.error('Error stringifying XML to JSON:', error));
