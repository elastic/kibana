import React from 'react';
import type { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import type { DataViewBase } from '@kbn/es-query';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { MetricExpression } from '../../types';
import type { AggregationTypes, NormalizedFields } from './types';
export interface CustomEquationEditorProps {
    onChange: (expression: MetricExpression) => void;
    expression: MetricExpression;
    fields: NormalizedFields;
    aggregationTypes: AggregationTypes;
    errors: IErrorObject;
    dataView: DataViewBase;
    kql: KqlPluginStart;
}
export declare function CustomEquationEditor({ onChange, expression, fields, aggregationTypes, errors, dataView, kql, }: CustomEquationEditorProps): React.JSX.Element;
