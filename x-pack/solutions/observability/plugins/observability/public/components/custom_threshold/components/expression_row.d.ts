import type { ReactElement } from 'react';
import React from 'react';
import type { AggregationType, IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { MetricExpression } from '../types';
interface ExpressionRowProps {
    title: ReactElement;
    fields: DataViewFieldBase[];
    expressionId: number;
    expression: MetricExpression;
    errors: IErrorObject;
    canDelete: boolean;
    addExpression(): void;
    remove(id: number): void;
    setRuleParams(id: number, params: MetricExpression): void;
    dataView: DataViewBase;
    children?: React.ReactNode;
    kql: KqlPluginStart;
}
export declare const ExpressionRow: React.FC<ExpressionRowProps>;
export declare const aggregationType: {
    [key: string]: AggregationType;
};
export {};
