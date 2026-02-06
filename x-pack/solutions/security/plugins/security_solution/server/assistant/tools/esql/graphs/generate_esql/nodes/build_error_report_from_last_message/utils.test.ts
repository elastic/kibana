/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EditorError } from '@kbn/esql-language';
import type { ValidateEsqlResult } from '../validate_esql_in_last_message_node/utils';
import { lastMessageWithErrorReport } from './utils';

describe('esql self healing validator utils', () => {
  it('with errors', () => {
    const query = 'FROM .logs\n| LIMIT 100';
    const message = `Here is the ESQL query to fetch 100 documents from the .logs index
\`\`\`esql
${query}
\`\`\``;

    const validateEsqlResult: ValidateEsqlResult = {
      query,
      isValid: false,
      parsingErrors: [
        { message: 'Syntax error', startLineNumber: 1, startColumn: 10 } as EditorError,
      ],
      executionError: new Error('Unknown index .logs'),
    };

    const result = lastMessageWithErrorReport(message, [validateEsqlResult]);

    expect(result.content).toContain(message);
    expect(result.content).toContain(
      'The above query has the following errors that still need to be fixed'
    );
    expect(result.content)
      .toEqual(`Here is the ESQL query to fetch 100 documents from the .logs index
\`\`\`esql
FROM .logs
| LIMIT 100
\`\`\`
The above query has the following errors that still need to be fixed:
1:10 Syntax error
Unknown index .logs

`);
  });

  it('without errors', () => {
    const query = 'FROM .logs\n| LIMIT 100';
    const message = `Here is the ESQL query to fetch 100 documents from the .logs index
        \`\`\`esql
        ${query}
        \`\`\``;

    const validateEsqlResult: ValidateEsqlResult = {
      query,
      isValid: true,
    };

    const result = lastMessageWithErrorReport(message, [validateEsqlResult]);

    expect(result.content).toContain(message);
    expect(result.content).toContain('Query is valid');
  });
});
