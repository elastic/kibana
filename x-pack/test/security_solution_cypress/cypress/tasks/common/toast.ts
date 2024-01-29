/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOAST_CLOSE_BUTTON } from '../../screens/common/toast';

export const closeToast = () => cy.get(TOAST_CLOSE_BUTTON).click();
