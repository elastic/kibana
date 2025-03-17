import { IntegrationType } from '@kbn/wci-common';

export const integrationTypeToLabel = (type: IntegrationType) => {
  switch (type) {
    case IntegrationType.index_source:
        return 'Index Source';
      case IntegrationType.external_server:
        return 'External Server';
      case IntegrationType.salesforce:
        return 'Salesforce';
      default:
        return type;
    }
  }