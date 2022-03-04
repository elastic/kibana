/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PROFILES = {
  CI: {
    INPUT_DELAYS: {
      TYPING: 500,
      MOUSE_CLICK: 1000,
    },
  },
  DEVELOPMENT: {
    INPUT_DELAYS: {
      TYPING: 5,
      MOUSE_CLICK: 5,
    },
  },
};

export function getUserActionProfile() {
  const PROFILE = process.env.CI ? 'CI' : 'DEVELOPMENT';
  return PROFILES[`${PROFILE}`];
}
