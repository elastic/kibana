/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { ReactElement, ElementType } from 'react';
import { generateLinkedRulesMenuItems } from '.';
import { rules } from '../mocks/rule_references.mock';
import {
  getSecurityLinkAction,
  securityLinkAnchorComponentMock,
} from '../mocks/security_link_component.mock';

const dataTestSubj = 'generateLinedRulesMenuItemsTest';
const linkedRules = rules;

describe('generateLinedRulesMenuItems', () => {
  it('should not render if the linkedRules length is falsy', () => {
    const result = generateLinkedRulesMenuItems({
      dataTestSubj,
      linkedRules: [],
      securityLinkAnchorComponent: securityLinkAnchorComponentMock,
    });
    expect(result).toBeNull();
  });
  it('should not render if the securityLinkAnchorComponent length is falsy', () => {
    const result = generateLinkedRulesMenuItems({
      dataTestSubj,
      linkedRules,
      securityLinkAnchorComponent: null as unknown as ElementType,
    });
    expect(result).toBeNull();
  });
  it('should render the first linked rules with left icon and does not apply the css if the length is 1', () => {
    const result: ReactElement[] = generateLinkedRulesMenuItems({
      dataTestSubj,
      linkedRules,
      securityLinkAnchorComponent: securityLinkAnchorComponentMock,
      leftIcon: 'check',
    }) as ReactElement[];

    result.forEach((link) => {
      const wrapper = render(link, {
        wrapper: EuiThemeProvider,
      });
      expect(wrapper.container).toMatchSnapshot();
      expect(wrapper.getByTestId('generateLinedRulesMenuItemsTestActionItem1a2b3c'));
      expect(wrapper.getByTestId('generateLinedRulesMenuItemsTestLeftIcon'));
    });
  });
  it('should render the second linked rule and apply the css when the length is > 1', () => {
    const result: ReactElement[] = getSecurityLinkAction(dataTestSubj);

    const wrapper = render(result[1], { wrapper: EuiThemeProvider });
    expect(wrapper.container).toMatchSnapshot();
    expect(wrapper.getByTestId('generateLinedRulesMenuItemsTestActionItem2a2b3c'));
  });
});
