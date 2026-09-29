/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { getProjectFeaturesUrl } from './util';

describe('util', () => {
  describe('getProductFeaturesUrl', () => {
    let cloud: Mocked<CloudStart>;

    beforeEach(() => {
      vi.clearAllMocks();
      cloud = cloudMock.createStart();
      cloud.serverless = {
        projectId: '1234',
      };
    });

    it('should return undefined if the projectId is not present', () => {
      expect(getProjectFeaturesUrl({ ...cloud, serverless: { projectId: undefined } })).toBe(
        undefined
      );
    });

    it('should return undefined if the projectsUrl is not present', () => {
      expect(getProjectFeaturesUrl(cloud)).toBe(undefined);
    });

    it('should return the correct url', () => {
      cloud.getUrls = vi.fn().mockReturnValue({
        projectsUrl: 'https://cloud.elastic.co/projects/',
      });
      expect(getProjectFeaturesUrl(cloud)).toBe(
        `${cloud.getUrls().projectsUrl}security/${
          cloud.serverless?.projectId
        }?open=securityProjectFeatures`
      );
    });
  });
});
