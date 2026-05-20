import type { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
interface Props {
    initialSlo?: SLODefinitionResponse;
    errors?: string[];
    onSelected: (slo: SLODefinitionResponse | undefined) => void;
    onBlur?: () => void;
}
declare function SloSelector({ initialSlo, onSelected, errors, onBlur }: Props): React.JSX.Element;
export { SloSelector };
export type { Props as SloSelectorProps };
