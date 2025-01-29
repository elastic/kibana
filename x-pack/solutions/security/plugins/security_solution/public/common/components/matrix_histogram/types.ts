/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPaddingSize, EuiTitleSize } from '@elastic/eui';
import type { Position } from '@elastic/charts';
import type { ESQuery } from '../../../../common/typed_json';
import type { GetLensAttributes, LensAttributes } from '../visualization_actions/types';

export interface MatrixHistogramOption {
  text: string;
  value: string | undefined;
}

export type GetSubTitle = (count: number) => string;
export type GetTitle = (matrixHistogramOption: MatrixHistogramOption) => string;

export interface MatrixHistogramConfigs {
  chartHeight?: number;
  defaultStackByOption: MatrixHistogramOption;
  getLensAttributes?: GetLensAttributes;
  hideHistogramIfEmpty?: boolean;
  legendPosition?: Position;
  lensAttributes?: LensAttributes;
  paddingSize?: EuiPaddingSize;
  panelHeight?: number;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title: string | GetTitle;
  titleSize?: EuiTitleSize;
}

export interface MatrixHistogramQueryProps {
  endDate: string;
  filterQuery?: ESQuery | string | undefined;
  startDate: string;
  isPtrIncluded?: boolean;
}
