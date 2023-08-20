/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import {
  getConsoleActionMenuItem,
  getUnIsolateActionMenuItem,
  openRowActionMenu,
  visitEndpointList,
} from '../../screens/endpoint_management';
import {
  CyIndexEndpointHosts,
  indexEndpointHosts,
} from '../../tasks/endpoint_management/index_endpoint_hosts';

describe(
  'When on the Endpoint List in Security Essentials PLI',
  {
    env: {
      ftrConfig: {
        productTypes: [{ product_line: 'security', product_tier: 'essentials' }],
      },
    },
  },
  () => {
    describe('and Isolated hosts exist', () => {
      let indexedEndpointData: CyIndexEndpointHosts;

      before(() => {
        indexEndpointHosts({ isolation: true }).then((response) => {
          indexedEndpointData = response;
        });
      });

      after(() => {
        if (indexedEndpointData) {
          indexedEndpointData.cleanup();
        }
      });

      beforeEach(() => {
        login();
        visitEndpointList();
        openRowActionMenu();
      });

      it('should display `release` options in host row actions', () => {
        getUnIsolateActionMenuItem().should('exist');
      });

      it('should NOT display access to response console', () => {
        getConsoleActionMenuItem().should('not.exist');
      });
    });
  }
);
