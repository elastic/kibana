/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { AppState } from '../../../../../state';
import { isIntegrationsPopupOpen } from '../../../../../state/selectors';
import { PopoverState, toggleIntegrationsPopover } from '../../../../../state/actions';
import { ActionsPopoverComponent } from '..';

const mapStateToProps = (state: AppState) => ({
  popoverState: isIntegrationsPopupOpen(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  togglePopoverIsVisible: (popoverState: PopoverState) => {
    return dispatch(toggleIntegrationsPopover(popoverState));
  },
});

export const ActionsPopover = connect(mapStateToProps, mapDispatchToProps)(ActionsPopoverComponent);
