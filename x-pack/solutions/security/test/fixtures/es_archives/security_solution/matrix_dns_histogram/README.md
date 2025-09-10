Within this folder is input test data for tests specific to the matrix dns
search strategy and for either corner cases, bugs found on customer sites, or correctness. When possible the mappings should be small and concise but ECS compliant here for these
types of tests. If small, do not gzip them, if large then please do gzip them.

Script that might be helpful if you have to maintain this test at some point to
generate a large set of values

```sh
#!/bin/sh

for i in {1..6600}
do
  echo "{"
  echo "  \"type\": \"doc\","
  echo "  \"value\": {"
  echo "    \"id\": \"$i\","
  echo "    \"index\": \"large_volume_dns_data\","
  echo "    \"source\": {"
  echo "      \"@timestamp\": \"2020-10-28T05:00:53.000Z\","
  echo "      \"dns\": {"
  echo "        \"question\": {"
  echo "          \"registered_domain\": \"domain_$i\","
  echo "          \"name\": \"domain_$i\""
  echo "        }"
  echo "      }"
  echo "    },"
  echo "    \"type\": \"_doc\""
  echo "  }"
  echo "}"
  echo ""
done
```