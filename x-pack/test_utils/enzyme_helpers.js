/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { shallow, mount, render } from 'enzyme'; // eslint-disable-line import/no-extraneous-dependencies
import { intl } from './mocks/intl';

/**
*  Creates the wrapper instance using shallow with provided intl object into context
*
*  @param  node The React element or cheerio wrapper
*  @param  options properties to pass into shallow wrapper
*  @return The wrapper instance around the rendered output with intl object in context
*/
export function shallowWithIntl(node, { context = {}, childContextTypes = {}, ...props } = {}) {
  const clonedNode = cloneNode(node);
  const options = getOptions(context, childContextTypes, props);

  if (React.isValidElement(node)) {
    return shallow(clonedNode, options);
  }

  return clonedNode.shallow(options);
}

/**
*  Creates the wrapper instance using mount with provided intl object into context
*
*  @param  node The React element or cheerio wrapper
*  @param  options properties to pass into mount wrapper
*  @return The wrapper instance around the rendered output with intl object in context
*/
export function mountWithIntl(node, { context = {}, childContextTypes = {}, ...props } = {}) {
  const clonedNode = cloneNode(node);
  const options = getOptions(context, childContextTypes, props);

  if (React.isValidElement(node)) {
    return mount(clonedNode, options);
  }

  return clonedNode.mount(options);
}

/**
*  Creates the wrapper instance using render with provided intl object into context
*
*  @param  node The React element or cheerio wrapper
*  @param  options properties to pass into render wrapper
*  @return The wrapper instance around the rendered output with intl object in context
*/
export function renderWithIntl(node, { context = {}, childContextTypes = {}, ...props } = {}) {
  const clonedNode = cloneNode(node);
  const options = getOptions(context, childContextTypes, props);

  if (React.isValidElement(node)) {
    return render(clonedNode, options);
  }

  return clonedNode.render(options);
}

function cloneNode(node) {
  if (!node) {
    throw new Error(`First argument should be cheerio object or React element, not ${node}`);
  }

  return React.cloneElement(node, { intl });
}

function getOptions(context, childContextTypes, props) {
  return {
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
}
