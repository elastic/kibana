/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Languages, LanguageDefinition } from '@kbn/search-api-panels';

export const javaDefinition: LanguageDefinition = {
  id: Languages.JAVA,
  name: i18n.translate('xpack.serverlessSearch.languages.java', { defaultMessage: 'Java' }),
  iconType: 'java.svg',
  github: {
    label: i18n.translate('xpack.serverlessSearch.languages.java.githubLabel', {
      defaultMessage: 'elasticsearch-java',
    }),
    link: 'https://github.com/elastic/elasticsearch-java',
  },
  // Code Snippets,
  installClient: `dependencies {
    implementation 'co.elastic.clients:elasticsearch-java:$elasticsearchVersion'
    implementation 'com.fasterxml.jackson.core:jackson-databind:$jacksonVersion'
}`,
  configureClient: ({ apiKey, url }) => `// URL and API key
String serverUrl = "${url}";
String apiKey = "${apiKey}";

// Create the low-level client
RestClient restClient = RestClient
  .builder(HttpHost.create(serverUrl))
  .setDefaultHeaders(new Header[]{
      new BasicHeader("Authorization", "ApiKey " + apiKey)
  })
  .build();

// Create the transport with a Jackson mapper
ElasticsearchTransport transport = new RestClientTransport(
  restClient, new JacksonJsonpMapper());

// And create the API client
ElasticsearchClient esClient = new ElasticsearchClient(transport);`,
  testConnection: `InfoResponse info = esClient.info();

logger.info(info.toString());`,
  ingestData: ({ ingestPipeline }) => `List<Book> books = new ArrayList<>();
books.add(new Book("9780553351927", "Snow Crash", "Neal Stephenson", "1992-06-01", 470));
books.add(new Book("9780441017225", "Revelation Space", "Alastair Reynolds", "2000-03-15", 585));
books.add(new Book("9780451524935", "1984", "George Orwell", "1985-06-01", 328));
books.add(new Book("9781451673319", "Fahrenheit 451", "Ray Bradbury", "1953-10-15", 227));
books.add(new Book("9780060850524", "Brave New World", "Aldous Huxley", "1932-06-01", 268));
books.add(new Book("9780385490818", "The Handmaid's Tale", "Margaret Atwood", "1985-06-01", 311));

BulkRequest.Builder br = new BulkRequest.Builder();

for (Book book : books) {
    br.operations(op -> op
        .index(idx -> idx
            .index("books")${ingestPipeline ? `\n            .pipeline("${ingestPipeline}")` : ''}
            .id(product.getId())
            .document(book)
        )
    );
}

BulkResponse result = esClient.bulk(br.build());

// Log errors, if any
if (result.errors()) {
    logger.error("Bulk had errors");
    for (BulkResponseItem item: result.items()) {
        if (item.error() != null) {
            logger.error(item.error().reason());
        }
    }
}`,
  ingestDataIndex: ({ apiKey, indexName, url, ingestPipeline }) => `// URL and API key
String serverUrl = "${url}";
String apiKey = "${apiKey}";

// Create the low-level client
RestClient restClient = RestClient
  .builder(HttpHost.create(serverUrl))
  .setDefaultHeaders(new Header[]{
      new BasicHeader("Authorization", "ApiKey " + apiKey)
  })
  .build();

// Create the transport with a Jackson mapper
ElasticsearchTransport transport = new RestClientTransport(
  restClient, new JacksonJsonpMapper());

// And create the API client
ElasticsearchClient esClient = new ElasticsearchClient(transport);

List<Book> books = new ArrayList<>();
books.add(new Book("9780553351927", "Snow Crash", "Neal Stephenson", "1992-06-01", 470));
books.add(new Book("9780441017225", "Revelation Space", "Alastair Reynolds", "2000-03-15", 585));
books.add(new Book("9780451524935", "1984", "George Orwell", "1985-06-01", 328));
books.add(new Book("9781451673319", "Fahrenheit 451", "Ray Bradbury", "1953-10-15", 227));
books.add(new Book("9780060850524", "Brave New World", "Aldous Huxley", "1932-06-01", 268));
books.add(new Book("9780385490818", "The Handmaid's Tale", "Margaret Atwood", "1985-06-01", 311));

BulkRequest.Builder br = new BulkRequest.Builder();

for (Book book : books) {
    br.operations(op -> op
        .index(idx -> idx
            .index("${indexName}")${
    ingestPipeline ? `\n            .pipeline("${ingestPipeline}")` : ''
  }
            .id(product.getId())
            .document(book)
        )
    );
}

BulkResponse result = esClient.bulk(br.build());

// Log errors, if any
if (result.errors()) {
    logger.error("Bulk had errors");
    for (BulkResponseItem item: result.items()) {
        if (item.error() != null) {
            logger.error(item.error().reason());
        }
    }
}`,
  buildSearchQuery: `String searchText = "snow";

SearchResponse<Book> response = esClient.search(s -> s
  .index("books")
  .query(q -> q
      .match(t -> t
          .field("name")
          .query(searchText)
      )
  ),
  Book.class
);

TotalHits total = response.hits().total();`,
};
