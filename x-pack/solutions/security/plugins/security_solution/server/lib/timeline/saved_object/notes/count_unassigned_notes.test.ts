/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { countUnassignedNotesLinkedToDocument } from './count_unassigned_notes';

describe('countUnassignedNotesLinkedToDocument', () => {
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSavedObjectsClient = {
      find: jest.fn().mockReturnValue({ total: 1 }),
    } as unknown as jest.Mocked<SavedObjectsClientContract>;
  });

  it('calls savedObjectsClient.find with correct parameters', async () => {
    const result = await countUnassignedNotesLinkedToDocument(
      mockSavedObjectsClient,
      'test-document-id'
    );

    expect(mockSavedObjectsClient.find.mock.lastCall).toMatchInlineSnapshot(`
      Array [
        Object {
          "filter": Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "siem-ui-timeline-note.attributes.eventId",
              },
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "test-document-id",
              },
            ],
            "function": "is",
            "type": "function",
          },
          "hasReference": Object {
            "id": "",
            "type": "siem-ui-timeline",
          },
          "type": "siem-ui-timeline-note",
        },
      ]
    `);

    expect(result).toEqual(1);
  });
});
