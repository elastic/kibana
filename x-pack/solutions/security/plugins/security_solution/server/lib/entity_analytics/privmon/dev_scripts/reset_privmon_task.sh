echo "This script requires ./create_superuser.sh to be run first"

curl "superuser:changeme@localhost:9200/.kibana_task_manager/_update/task:privmon:default:1.0.0" -d '{"script" : "ctx._source.task.status = \"idle\"; ctx._source.task.remove(\"retryAt\");"}' -H "Content-Type: application/json"