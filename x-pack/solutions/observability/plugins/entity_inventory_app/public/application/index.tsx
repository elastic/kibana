/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';

export function EntityInventoryApp() {
  return (
    <EuiPanel>
      <h1>Entity Inventory</h1>
    </EuiPanel>
  );
}

export function renderApp(element: HTMLElement) {
  ReactDOM.render(<EntityInventoryApp />, element);
  return () => ReactDOM.unmountComponentAtNode(element);
}
