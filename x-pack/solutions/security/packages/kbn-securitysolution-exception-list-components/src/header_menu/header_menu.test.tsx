/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEvent, fireEvent, render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import React from 'react';
import { HeaderMenu } from '.';
import { actions, actionsWithDisabledDelete } from '../mocks/header.mock';
import { getSecurityLinkAction } from '../mocks/security_link_component.mock';

describe('HeaderMenu', () => {
  it('should render button icon with default settings', () => {
    const wrapper = render(
      <HeaderMenu iconType="boxesHorizontal" disableActions={false} actions={null} />
    );

    expect(wrapper.container).toMatchSnapshot();

    expect(wrapper.getByTestId('ButtonIcon')).toBeInTheDocument();
    expect(wrapper.queryByTestId('EmptyButton')).not.toBeInTheDocument();
    expect(wrapper.queryByTestId('MenuPanel')).not.toBeInTheDocument();
  });
  it('should not render icon', () => {
    const wrapper = render(<HeaderMenu disableActions={false} actions={null} />);

    expect(wrapper.container).toMatchSnapshot();

    expect(wrapper.getByTestId('ButtonIcon')).toBeInTheDocument();
    expect(wrapper.queryByTestId('EmptyButton')).not.toBeInTheDocument();
    expect(wrapper.queryByTestId('MenuPanel')).not.toBeInTheDocument();
  });
  it('should render button icon disabled', () => {
    const wrapper = render(
      <HeaderMenu
        iconType="boxesHorizontal"
        disableActions={false}
        actions={actionsWithDisabledDelete}
      />
    );

    fireEvent.click(wrapper.getByTestId('ButtonIcon'));
    expect(wrapper.container).toMatchSnapshot();
    expect(wrapper.getByTestId('ActionItemdelete')).toBeDisabled();
    expect(wrapper.getByTestId('ActionItemedit')).toBeEnabled();
  });

  it('should render empty button icon with different icon settings', () => {
    const wrapper = render(
      <HeaderMenu
        disableActions={false}
        emptyButton
        actions={null}
        iconSide="right"
        iconType="cheer"
      />
    );

    expect(wrapper.container).toMatchSnapshot();

    expect(wrapper.getByTestId('EmptyButton')).toBeInTheDocument();
    expect(wrapper.queryByTestId('ButtonIcon')).not.toBeInTheDocument();
    expect(wrapper.queryByTestId('MenuPanel')).not.toBeInTheDocument();
  });

  it('should render empty button icon with actions and open the popover when clicked', () => {
    const wrapper = render(
      <HeaderMenu
        disableActions={false}
        emptyButton
        actions={actions}
        iconSide="right"
        iconType="cheer"
        anchorPosition="downLeft"
      />
    );

    expect(wrapper.container).toMatchSnapshot();

    expect(wrapper.getByTestId('EmptyButton')).toBeInTheDocument();
    expect(wrapper.queryByTestId('ButtonIcon')).not.toBeInTheDocument();
    fireEvent.click(wrapper.getByTestId('EmptyButton'));
    expect(wrapper.getByTestId('ActionItemedit')).toBeInTheDocument();
    expect(wrapper.getByTestId('MenuPanel')).toBeInTheDocument();
  });
  it('should render empty button icon with actions and should not open the popover when clicked if disableActions', () => {
    const wrapper = render(
      <HeaderMenu
        disableActions
        emptyButton
        actions={actions}
        iconSide="right"
        iconType="cheer"
        anchorPosition="downLeft"
      />
    );

    expect(wrapper.container).toMatchSnapshot();

    expect(wrapper.getByTestId('EmptyButton')).toBeInTheDocument();
    expect(wrapper.queryByTestId('ButtonIcon')).not.toBeInTheDocument();
    fireEvent.click(wrapper.getByTestId('EmptyButton'));
    expect(wrapper.queryByTestId('ActionItemedit')).not.toBeInTheDocument();
    expect(wrapper.queryByTestId('MenuPanel')).not.toBeInTheDocument();
  });
  it('should call onEdit if action has onClick', () => {
    const onEdit = jest.fn();
    const customAction = [...actions];
    customAction[0].onClick = onEdit;
    const wrapper = render(<HeaderMenu disableActions={false} actions={actions} />);
    fireEvent.click(wrapper.getByTestId('ButtonIcon'));
    fireEvent.click(wrapper.getByTestId('ActionItemedit'));
    expect(onEdit).toBeCalled();
  });

  it('should render custom Actions', () => {
    const customActions = getSecurityLinkAction('headerMenuTest');
    const wrapper = render(
      <HeaderMenu
        iconType="boxesHorizontal"
        disableActions={false}
        emptyButton
        actions={customActions}
        useCustomActions
      />,

      { wrapper: EuiThemeProvider }
    );

    expect(wrapper.container).toMatchSnapshot();

    expect(wrapper.getByTestId('EmptyButton')).toBeInTheDocument();
    fireEvent.click(wrapper.getByTestId('EmptyButton'));
    expect(wrapper.queryByTestId('MenuPanel')).toBeInTheDocument();
  });
  it('should stop propagation when clicking on the menu', () => {
    const onEdit = jest.fn();
    const customAction = [...actions];
    customAction[0].onClick = onEdit;
    const wrapper = render(
      <HeaderMenu
        iconType="boxesHorizontal"
        dataTestSubj="headerMenu"
        disableActions={false}
        actions={actions}
      />
    );
    const headerMenu = wrapper.getByTestId('headerMenuItems');
    const click = createEvent.click(headerMenu);
    const result = fireEvent(headerMenu, click);
    expect(result).toBe(true);
  });
});
