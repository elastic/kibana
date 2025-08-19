import { DataStreamSpacesAdapter, FieldMap } from '@kbn/data-stream-adapter';
import type {
    IndicesIndexSettings,
} from '@elastic/elasticsearch/lib/api/types';

export type CreateDataStream = (params: {
    resource:
    | 'checkpoint'
    | 'checkpointWrites';
    fieldMap: FieldMap;
    kibanaVersion: string;
    spaceId?: string;
    settings?: IndicesIndexSettings;
    writeIndexOnly?: boolean;
}) => DataStreamSpacesAdapter;


export interface AssistantResourceNames {
    componentTemplate: {
        checkpoint: string;
        checkpointWrites: string;
    };
    indexTemplate: {
        checkpoint: string;
        checkpointWrites: string;
    };
    aliases: {
        checkpoint: string;
        checkpointWrites: string;
    };
    indexPatterns: {
        checkpoint: string;
        checkpointWrites: string;
    };
}

const TOTAL_FIELDS_LIMIT = 2500;

export class CreateDataStreamClient {
    static readonly resourceNames: AssistantResourceNames = {
        componentTemplate: {
            checkpoint: this.getResourceName('component-template-checkpoints'),
            checkpointWrites: this.getResourceName('component-template-checkpoint-writes'),
        },
        aliases: {
            checkpoint: this.getResourceName('checkpoints'),
            checkpointWrites: this.getResourceName('checkpoint-writes'),
        },
        indexTemplate: {
            checkpoint: this.getResourceName('index-template-checkpoints'),
            checkpointWrites: this.getResourceName('index-template-checkpoint-writes'),
        },
        indexPatterns: {
            checkpoint: this.getResourceName('checkpoints*'),
            checkpointWrites: this.getResourceName('checkpoint-writes*'),
        },
    };

    static getResourceName(resource: string) {
        return `.kibana-elastic-assistant-checkpoint-saver-${resource}`;
    }

    createDataStream: CreateDataStream = ({
        resource,
        kibanaVersion,
        fieldMap,
        settings,
        writeIndexOnly,
    }) => {
        const newDataStream = new DataStreamSpacesAdapter(CreateDataStreamClient.resourceNames.aliases[resource], {
            kibanaVersion,
            totalFieldsLimit: TOTAL_FIELDS_LIMIT,
            writeIndexOnly,
        });

        newDataStream.setComponentTemplate({
            name: CreateDataStreamClient.resourceNames.componentTemplate[resource],
            fieldMap,
            settings,
        });

        newDataStream.setIndexTemplate({
            name: CreateDataStreamClient.resourceNames.indexTemplate[resource],
            componentTemplateRefs: [CreateDataStreamClient.resourceNames.componentTemplate[resource]],
        });

        return newDataStream;
    };
}