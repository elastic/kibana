/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { I18nProvider, intlShape } from '@kbn/i18n/react';
import { mount, shallow, render } from 'enzyme'; // eslint-disable-line import/no-extraneous-dependencies

let intl;

/**
 * This component is used to get intl object passed by IntlProvider via context
 */
class IntlGetter extends React.Component {
  static contextTypes = { intl: intlShape };

  constructor(props, context) {
    super(props, context);

    intl = this.context.intl;
  }

  render() {
    return '';
  }
}

mount(<I18nProvider><IntlGetter/></I18nProvider>);

function getOptions(context = {}, childContextTypes = {}, props = []) {
  return {
    context: {
      ...context,
      intl,
    },
    childContextTypes: {
      ...childContextTypes,
      intl: intlShape,
    },
    ...props,
  };
}

/**
 * When using React-Intl `injectIntl` on components, props.intl is required.
 */
function nodeWithIntlProp(node) {
  return React.cloneElement(node, { intl });
}

/**
 *  Creates the wrapper instance using shallow with provided intl object into context
 *
 *  @param  node The React element or cheerio wrapper
 *  @param  options properties to pass into shallow wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function shallowWithIntl(node, { context, childContextTypes, ...props } = {}) {
  const options = getOptions(context, childContextTypes, props);

  return shallow(
    nodeWithIntlProp(node),
    options,
  );
}

/**
 *  Creates the wrapper instance using mount with provided intl object into context
 *
 *  @param  node The React element or cheerio wrapper
 *  @param  options properties to pass into mount wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function mountWithIntl(node, { context, childContextTypes, ...props } = {}) {
  const options = getOptions(context, childContextTypes, props);

  return mount(
    nodeWithIntlProp(node),
    options,
  );
}

/**
 *  Creates the wrapper instance using render with provided intl object into context
 *
 *  @param  node The React element or cheerio wrapper
 *  @param  options properties to pass into render wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function renderWithIntl(node, { context, childContextTypes, ...props } = {}) {
  const options = getOptions(context, childContextTypes, props);

  return render(
    nodeWithIntlProp(node),
    options,
  );
}
