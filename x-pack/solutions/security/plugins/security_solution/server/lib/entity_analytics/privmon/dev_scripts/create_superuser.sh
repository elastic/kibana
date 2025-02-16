#!/bin/bash

ELASTICSEARCH_URL="elastic:changeme@localhost:9200"
# create role system_indices_superuser
curl -X POST -H "Content-Type: application/json" -d '{
  "cluster": ["all"],
  "indices": [
    {
      "names": ["*"],
      "privileges": ["all"],
      "allow_restricted_indices": true
    }
  ]
}' "http://${ELASTICSEARCH_URL}/_security/role/system_indices_superuser"
# create a user with the superuser role
curl -X POST -u elastic:changeme -H "Content-Type: application/json" -d '{
  "password" : "changeme",
  "roles" : [ "superuser", "system_indices_superuser" ],
  "full_name" : "Internal Admin"
}' "http://${ELASTICSEARCH_URL}/_security/user/superuser"