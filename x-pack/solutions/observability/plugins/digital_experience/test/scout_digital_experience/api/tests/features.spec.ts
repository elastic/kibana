/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';

interface FeatureResponse {
  id: string;
  app: string[];
  privileges: {
    all: { api: string[]; ui: string[]; app: string[] };
    read: { api: string[]; ui: string[]; app: string[] };
  };
}

apiTest.describe('GET /api/features', { tag: tags.stateful.classic }, () => {
  apiTest(
    'includes the digital_experience feature with its privileges',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');

      const response = await apiClient.get('api/features', {
        headers: { ...apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const feature = (response.body as FeatureResponse[]).find(
        ({ id }) => id === 'digital_experience'
      );
      expect(feature).toBeDefined();
      expect(feature!.privileges.all).toMatchObject({
        app: ['digital_experience', 'kibana'],
        api: ['read_digital_experience', 'manage_digital_experience'],
        ui: ['show', 'save'],
      });
      expect(feature!.privileges.read).toMatchObject({
        app: ['digital_experience', 'kibana'],
        api: ['read_digital_experience'],
        ui: ['show'],
      });
    }
  );
});
