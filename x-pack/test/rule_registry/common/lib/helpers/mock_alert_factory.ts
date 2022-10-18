/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// implements a minimal mock alert factory used by a few tests

class MockAlert {
  id: string;

  constructor(alertId: string) {
    this.id = alertId;
  }
  getUuid() {
    return 'uuid-1';
  }
}

export function getMockAlertFactory() {
  return {
    create(alertId: string) {
      return new MockAlert(alertId);
    },
  };
}
