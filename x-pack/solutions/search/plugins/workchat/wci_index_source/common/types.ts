import { IntegrationConfiguration } from "@kbn/wci-common";

export interface WCIIndexSourceConfiguration extends IntegrationConfiguration {
    index: string;
    description: string;
    fields: {
      filterFields: WCIIndexSourceFilterField[];
      contextFields: WCIIndexSourceContextField[];
    };
    queryTemplate: string;
  }
  
  export interface WCIIndexSourceFilterField {
    field: string;
    type: string;
    getValues: boolean;
    description: string;
  }
  
  export interface WCIIndexSourceContextField {
    field: string;
    description: string;
    type?: 'semantic';
  }