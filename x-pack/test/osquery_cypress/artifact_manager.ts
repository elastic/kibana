/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import axios from 'axios';
// import { last } from 'lodash';

export async function getLatestVersion(): Promise<string> {
  return '8.2.0-SNAPSHOT';
  // const response: any = await axios('https://artifacts-api.elastic.co/v1/versions');
  // return last(response.data.versions as string[]) || '8.2.0-SNAPSHOT';
}
