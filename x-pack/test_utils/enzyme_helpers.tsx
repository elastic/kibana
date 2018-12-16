/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Components using the react-intl module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * intl context around them.
 */

import { I18nProvider, InjectedIntl, intlShape } from '@kbn/i18n/react';
import { mount, ReactWrapper, render, shallow } from 'enzyme';
import React, { ReactElement, ValidationMap } from 'react';

// Use fake component to extract `intl` property to use in tests.
const { intl } = (mount(
  <I18nProvider>
    <br />
  </I18nProvider>
).find('IntlProvider') as ReactWrapper<{}, {}, import('react-intl').IntlProvider>)
  .instance()
  .getChildContext();

function getOptions(context = {}, childContextTypes = {}, props = {}) {
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
function nodeWithIntlProp<T>(node: ReactElement<T>): ReactElement<T & { intl: InjectedIntl }> {
  return React.cloneElement<any>(node, { intl });
}

/**
 *  Creates the wrapper instance using shallow with provided intl object into context
 *
 *  @param node The React element or cheerio wrapper
 *  @param options properties to pass into shallow wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function shallowWithIntl<T>(
  node: ReactElement<T>,
  {
    context,
    childContextTypes,
    ...props
  }: {
    context?: any;
    childContextTypes?: ValidationMap<any>;
  } = {}
) {
  const options = getOptions(context, childContextTypes, props);

  return shallow(nodeWithIntlProp(node), options);
}

/**
 *  Creates the wrapper instance using mount with provided intl object into context
 *
 *  @param node The React element or cheerio wrapper
 *  @param options properties to pass into mount wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function mountWithIntl<T>(
  node: ReactElement<T>,
  {
    context,
    childContextTypes,
    ...props
  }: {
    context?: any;
    childContextTypes?: ValidationMap<any>;
  } = {}
) {
  const options = getOptions(context, childContextTypes, props);

  return mount(nodeWithIntlProp(node), options);
}

/**
 *  Creates the wrapper instance using render with provided intl object into context
 *
 *  @param node The React element or cheerio wrapper
 *  @param options properties to pass into render wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function renderWithIntl<T>(
  node: ReactElement<T>,
  {
    context,
    childContextTypes,
    ...props
  }: {
    context?: any;
    childContextTypes?: ValidationMap<any>;
  } = {}
) {
  const options = getOptions(context, childContextTypes, props);

  return render(nodeWithIntlProp(node), options);
}
