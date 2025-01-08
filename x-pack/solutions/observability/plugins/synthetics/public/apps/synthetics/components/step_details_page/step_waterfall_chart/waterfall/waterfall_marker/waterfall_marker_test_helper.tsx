/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { JourneyStep } from '../../../../../../../../common/runtime_types';
import { WaterfallContext } from '../context/waterfall_context';

const EmbeddableMock = ({
  title,
  appendTitle,
  reportType,
  attributes,
}: {
  title: string;
  appendTitle: JSX.Element | undefined;
  reportType: string;
  attributes: unknown;
  axisTitlesVisibility: { x: boolean; yLeft: boolean; yRight: boolean };
  legendIsVisible: boolean;
}) => (
  <div>
    <h1>{title}</h1>
    <div
      aria-label={i18n.translate('xpack.synthetics.embeddableMock.div.appendTitleLabel', {
        defaultMessage: 'append title',
      })}
    >
      {appendTitle}
    </div>
    <div>{reportType}</div>
    <div
      aria-label={i18n.translate('xpack.synthetics.embeddableMock.div.attributesLabel', {
        defaultMessage: 'attributes',
      })}
    >
      {JSON.stringify(attributes)}
    </div>
  </div>
);

export const TestWrapper = ({
  basePath,
  activeStep,
  children,
}: {
  basePath: string;
  activeStep?: JourneyStep;
  children: JSX.Element;
}) => (
  <KibanaContextProvider
    services={{
      exploratoryView: {
        ExploratoryViewEmbeddable: jest.fn((props: any) => <EmbeddableMock {...props} />),
      },
    }}
  >
    <WaterfallContext.Provider
      value={{
        activeStep,
      }}
    >
      {children}
    </WaterfallContext.Provider>
  </KibanaContextProvider>
);
