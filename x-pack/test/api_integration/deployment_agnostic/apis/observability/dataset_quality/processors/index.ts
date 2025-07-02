/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const processors = [
  {
    script: {
      tag: 'normalize log level',
      lang: 'painless',
      source: `
        String level = ctx['log.level'];
        if ('0'.equals(level)) {
          ctx['log.level'] = 'info';
        } else if ('1'.equals(level)) {
          ctx['log.level'] = 'debug';
        } else if ('2'.equals(level)) {
          ctx['log.level'] = 'warning';
        } else if ('3'.equals(level)) {
          ctx['log.level'] = 'error';
        } else {
          throw new Exception("Not a valid log level");
        }
      `,
    },
  },
];
