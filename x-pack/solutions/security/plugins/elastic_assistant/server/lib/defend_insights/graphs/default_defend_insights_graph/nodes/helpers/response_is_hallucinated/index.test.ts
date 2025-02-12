/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { responseIsHallucinated } from '.';

describe('responseIsHallucinated', () => {
  it('returns true when the response is hallucinated', () => {
    expect(
      responseIsHallucinated(
        'tactics like **Credential Access**, **Command and Control**, and **Persistence**.",\n      "entitySummaryMarkdown": "Malware detected on host **{{ host.name hostNameValue }}**'
      )
    ).toBe(true);
  });

  it('returns false when the response is not hallucinated', () => {
    expect(
      responseIsHallucinated(
        'A malicious file {{ file.name WsmpRExIFs.dll }} was detected on {{ host.name 082a86fa-b87d-45ce-813e-eed6b36ef0a9 }}\\n- The file was executed by'
      )
    ).toBe(false);
  });
});
