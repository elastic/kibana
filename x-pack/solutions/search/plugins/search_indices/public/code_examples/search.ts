/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchCodeExamples } from '../types';

import { JavascriptSearchExample } from './javascript';
import { PythonSearchExample } from './python';
import { CurlSearchCodeExample } from './curl';
import { ConsoleSearchExample } from './sense';

export const SearchCodeExample: SearchCodeExamples = {
  sense: ConsoleSearchExample,
  curl: CurlSearchCodeExample,
  javascript: JavascriptSearchExample,
  python: PythonSearchExample,
};
