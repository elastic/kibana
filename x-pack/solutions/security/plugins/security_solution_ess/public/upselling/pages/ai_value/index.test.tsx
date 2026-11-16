/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { AIValueUpsellingPageESS } from '.';

jest.mock('../attack_discovery/upgrade_actions', () => ({
  UpgradeActions: () => <button type="button">{'Upgrade'}</button>,
}));

jest.mock('@kbn/shared-ux-page-kibana-template', () => {
  const KibanaPageTemplate = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  // eslint-disable-next-line react/display-name
  KibanaPageTemplate.Section = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  return { KibanaPageTemplate };
});

jest.mock('../../../common/services', () => ({
  useKibana: jest.fn(() => ({
    services: {
      docLinks: {
        links: {
          siem: {
            valueReport: 'https://www.elastic.co/guide/en/security/current/ai-value-report.html',
          },
        },
      },
    },
  })),
}));

describe('AIValueUpsellingPageESS', () => {
  it('renders the assistant beacon', () => {
    render(
      <MockAppHeaderProvider>
        <AIValueUpsellingPageESS />
      </MockAppHeaderProvider>
    );

    expect(screen.getByTestId('assistantAvatar')).toBeInTheDocument();
  });
});
