export interface ESSearchResult {
    hits: {
      total: number | { value: number; relation: string };
      hits: Array<{
        _id: string;
        _index: string;
        _score: number;
        _source: ESDocumentSource;
      }>;
    };
  }
  
export interface ESDocumentSource {
    created_at: string;
    id: string;
    metadata: {
      case_number: string;
      priority: string;
      closed: boolean;
    };
    object_type: string;
    owner: string;
    title: string;
    updated_at: string;
    url: string;
    body: string;
    content_semantic: string;
  }

export interface SearchParams {
    id?: string;
    size? : number;
    owner?: string;
    priority?: string;
    closed?: boolean;
    caseNumber?: string
    createdAfter?: string;
    createdBefore?: string;
    indexName: string;
    deleted: string;
    semanticQuery: string;
  }

  export interface SearchHit {
    title: string;
    id: string;
    content: any;
  };

  export interface QueryResult {
    type: "text";
    text: string;
}