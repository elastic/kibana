/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastMessageWithUnvalidatedReport } from './utils';

describe('esql self healing validator utils', () => {
  it('with errors', () => {
    const response = `
Here is the ES|QL query to retrieve 10 items from the ".data.hello" index:

\`\`\`esql
FROM ".data.hello"
| LIMIT 10
\`\`\`

This query limits the results to 10 items from the specified index. Let me know if you need further assistance!
        `;

    const result = lastMessageWithUnvalidatedReport(response);

    expect(result.content).toEqual(
      `
Here is the ES|QL query to retrieve 10 items from the ".data.hello" index:

\`\`\`esql
FROM ".data.hello"
| LIMIT 10

// The resulting query was generated as a best effort example, but we are unable to validate it, as the suitable data could not be found.
\`\`\`

This query limits the results to 10 items from the specified index. Let me know if you need further assistance!
        `
    );
  });
});
