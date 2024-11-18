/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const deleteIndex = (index: string) => {
  cy.task('deleteIndex', index);
};

export const deleteDataStream = (dataStreamName: string) => {
  cy.task('deleteDataStream', dataStreamName);
};

export const deleteAllDocuments = (target: string) => {
  refreshIndex(target);

  cy.task('deleteDocuments', target);
};

export const createIndex = (indexName: string, properties: Record<string, unknown>) => {
  cy.task('createIndex', { index: indexName, properties });
};

export const createDocument = (indexName: string, document: Record<string, unknown>) => {
  cy.task('createDocument', { index: indexName, document });
};

export const waitForNewDocumentToBeIndexed = (index: string, initialNumberOfDocuments: number) => {
  cy.waitUntil(
    () =>
      cy.task('searchIndex', index).then((currentNumberOfDocuments) => {
        if (typeof currentNumberOfDocuments === 'number') {
          return currentNumberOfDocuments > initialNumberOfDocuments;
        } else {
          return false;
        }
      }),
    { interval: 500, timeout: 12000 }
  );
};

export const refreshIndex = (index: string) => {
  cy.waitUntil(
    () =>
      cy.task('refreshIndex', index).then((result) => {
        return result === true;
      }),
    { interval: 500, timeout: 12000 }
  );
};
