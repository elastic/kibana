/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';

describe(
  'Roles for Security Essential PLI with Endpoint Essentials addon',
  {
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => {
    describe('for role: t1_analyst', () => {
      before(() => {
        login('t1_analyst');
      });

      // FIXME:PT implement
      it('should do something', () => {});
    });

    describe('for role: t2_analyst', () => {
      before(() => {
        login('t2_analyst');
      });

      // FIXME:PT implement
      it('should do something', () => {});
    });

    describe('for role: t3_analyst', () => {
      before(() => {
        login('t3_analyst');
      });

      // FIXME:PT implement
      it('should do something', () => {});
    });

    describe('for role: threat_intelligence_analyst', () => {
      before(() => {
        login('threat_intelligence_analyst');
      });

      // FIXME:PT implement
      it('should do something', () => {});
    });

    describe('for role: rule_author', () => {
      before(() => {
        login('rule_author');
      });

      // FIXME:PT implement
      it('should do something', () => {});
    });

    describe('for role: soc_manager', () => {
      before(() => {
        login('soc_manager');
      });

      // FIXME:PT implement
      it('should do something', () => {});
    });

    describe('for role: detections_admin', () => {
      before(() => {
        login('detections_admin');
      });

      // FIXME:PT implement
      it('should do something', () => {});
    });

    describe('for role: platform_engineer', () => {
      before(() => {
        login('platform_engineer');
      });

      // FIXME:PT implement
      it('should do something', () => {});
    });

    describe('for role: endpoint_operations_manager', () => {
      before(() => {
        login('endpoint_operations_manager');
      });

      // FIXME:PT implement
      it('should do something', () => {});
    });
  }
);
