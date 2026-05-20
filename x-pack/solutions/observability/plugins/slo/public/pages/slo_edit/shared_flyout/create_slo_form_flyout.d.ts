import type { CreateSLOInput } from '@kbn/slo-schema';
import type { RecursivePartial } from '@kbn/utility-types';
import React from 'react';
import type { FormSettings } from '../types';
export declare const sloEditFormFooterPortal: import("react-reverse-portal").HtmlPortalNode<React.ComponentType<any> | React.Component<any, {}, any>>;
export default function CreateSLOFormFlyout({ onClose, initialValues, formSettings, }: {
    onClose: () => void;
    initialValues: RecursivePartial<CreateSLOInput>;
    formSettings?: FormSettings;
}): React.JSX.Element;
