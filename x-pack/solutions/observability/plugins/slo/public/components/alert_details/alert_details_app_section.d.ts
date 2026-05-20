import React from 'react';
import type { AlertDetailsAppSectionProps } from '@kbn/observability-plugin/public';
import type { BurnRateAlert, BurnRateRule } from './types';
interface AppSectionProps extends AlertDetailsAppSectionProps {
    alert: BurnRateAlert;
    rule: BurnRateRule;
}
export default function AlertDetailsAppSection({ alert, rule, setSources }: AppSectionProps): React.JSX.Element;
export {};
