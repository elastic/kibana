/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TABLE_CLASS_NAME = 'rule-update-diff-table';
export const CODE_CLASS_NAME = 'rule-update-diff-code';
export const GUTTER_CLASS_NAME = 'rule-update-diff-gutter';
export const DARK_THEME_CLASS_NAME = 'rule-update-diff-dark-theme';

export const COLORS = {
  light: {
    gutterBackground: {
      deletion: 'rgb(255, 215, 213)',
      insertion: 'rgb(204, 255, 216)',
    },
    lineBackground: {
      deletion: 'rgb(255, 235, 233)',
      insertion: 'rgb(230, 255, 236)',
    },
    characterBackground: {
      deletion: 'rgba(255, 129, 130, 0.4)',
      insertion: 'rgb(171, 242, 188)',
    },
  },
  dark: {
    gutterBackground: {
      deletion: 'rgba(248, 81, 73, 0.3)',
      insertion: 'rgba(63, 185, 80, 0.3)',
    },
    lineBackground: {
      deletion: 'rgba(248, 81, 73, 0.1)',
      insertion: 'rgba(46, 160, 67, 0.15)',
    },
    characterBackground: {
      deletion: 'rgba(248, 81, 73, 0.4)',
      insertion: 'rgba(46, 160, 67, 0.4)',
    },
  },
};
