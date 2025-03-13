import { SearchParams } from "./constants.js";

export function extractSearchParams(request: Record<string, any>): SearchParams | null {
  if (!request.params.arguments) {
    return null;
  }

  const args = request.params.arguments;
  const extracted_params: Partial<SearchParams> = {};

  if ('indexName' in args) {
    extracted_params.indexName = args.indexName;
  }

  if ('id' in args) {
    extracted_params.id = args.id;
  }

  if ('size' in args) {
    const sizeValue = Number(args.size);
    
    if (!isNaN(sizeValue)) {
      extracted_params.size = sizeValue;
    }
  }
  
  if ('owner' in args) {
    extracted_params.owner = args.owner;
  }
  
  if ('priority' in args) {
    extracted_params.priority = args.priority;
  }

  if ('closed' in args) {
    extracted_params.closed = args.closed;
  }

  if ('case_number' in args) {
    extracted_params.caseNumber = args.case_number;
  }
  
  if ('created_after' in args) {
    extracted_params.createdAfter = args.created_after;
  }
  
  if ('created_before' in args) {
    extracted_params.createdBefore = args.created_before;
  }

  if ('semantic_query' in args) {
    extracted_params.semanticQuery = args.semantic_query;
  }

  if ('index_name' in args) {
    extracted_params.indexName = args.index_name;
  } else {
    return null;
  }

  return extracted_params as SearchParams;
}