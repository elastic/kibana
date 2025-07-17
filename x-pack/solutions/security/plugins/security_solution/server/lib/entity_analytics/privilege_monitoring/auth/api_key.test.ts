/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Privilege Monitoring API Key Manager', () => {
  describe('generate', () => {
    it('should create and store an API key', async () => {
      // TODO: Implement this test for creating and storing an API key
    });
    it('should throw if encryptedSavedObjects is missing', async () => {
      // TODO: Implement this test for missing encryptedSavedObjects
    });
    it('should throw if request is missing', async () => {
      // TODO: Implement this test for missing request
    });
  });

  describe('getClient', () => {
    it('should return clusterClient if key is found', async () => {
      // TODO: Implement this test for returning clusterClient when API key is found
    });

    it('should return undefined if no API key is found', async () => {
      // TODO: Implement this test for returning undefined when no API key is found
    });
  });

  describe('getRequestFromApiKey', () => {
    it('should return a fake request from API key', async () => {
      // TODO: Implement this test for returning a fake request from API key
    });
  });
});
