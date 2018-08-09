/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { mount } from 'enzyme'; // eslint-disable-line import/no-extraneous-dependencies
import { intl } from './mocks/intl';

/**
 *  Creates the wrapper instance with provided intl object into context
 *
 *  @param  node The React element or cheerio wrapper
 *  @param  options properties to pass into mount wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function mountWithIntl(node, { context = {}, childContextTypes = {}, ...props } = {}) {
  if (!node) {
    throw new Error(`First argument should be cheerio object or React element, not ${node}`);
  }

  const clonedNode = React.cloneElement(node, { intl });

  const options = {
    context: {
      ...context,
      intl,
    },
    childContextTypes: {
      ...childContextTypes,
      intl: PropTypes.any,
    },
    ...props,
  };

  if (React.isValidElement(node)) {
    return mount(clonedNode, options);
  }

  return clonedNode.mount(options);
}

export { intl };
