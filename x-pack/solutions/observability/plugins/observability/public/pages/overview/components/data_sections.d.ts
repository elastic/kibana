import React from 'react';
import type { BucketSize } from '../helpers/calculate_bucket_size';
interface Props {
    bucketSize: BucketSize;
}
export type DataSectionsApps = 'alert' | 'infra_logs' | 'infra_metrics' | 'apm' | 'ux';
export declare const DATA_SECTIONS: Readonly<DataSectionsApps[]>;
export declare function DataSections({ bucketSize }: Props): React.JSX.Element;
export {};
