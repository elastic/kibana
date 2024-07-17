#!/bin/bash

# Function to determine the config file
get_config_file() {
    local test_path=$1
    local dir=$(dirname "$test_path")
    while [[ "$dir" != "/" ]]; do
        if [[ -f "$dir/configs/ess.config.ts" ]]; then
            echo "$dir/configs/ess.config.ts"
            return
        elif [[ -f "$dir/configs/serverless.config.ts" ]]; then
            echo "$dir/configs/serverless.config.ts"
            return
        fi
        dir=$(dirname "$dir")
    done
    echo "Error: No config file found" >&2
    exit 1
}

# Check if a test file path is provided
if [ $# -eq 0 ]; then
    echo "Please provide the path to the test file."
    exit 1
fi

TEST_FILE=$1
CONFIG_FILE=$(get_config_file "$TEST_FILE")

if [ $? -ne 0 ]; then
    echo "$CONFIG_FILE"
    exit 1
fi

# Determine the project root (where the 'scripts' folder is located)
PROJECT_ROOT=$(pwd)
while [[ ! -d "$PROJECT_ROOT/scripts" && "$PROJECT_ROOT" != "/" ]]; do
    PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ "$PROJECT_ROOT" == "/" ]]; then
    echo "Error: Could not find the project root directory containing the 'scripts' folder."
    exit 1
fi

# Start the server
echo "Starting the server..."
node "$PROJECT_ROOT/scripts/functional_tests_server" --config "$CONFIG_FILE" &
SERVER_PID=$!

# Function to kill the server process
cleanup() {
    echo "Stopping the server..."
    kill $SERVER_PID
    exit
}

# Set up trap to ensure server is stopped on script exit
trap cleanup EXIT

# Wait for the server to be ready
echo "Waiting for the server to be ready..."
while true; do
    if grep -q "Elasticsearch and Kibana are ready for functional testing" <(tail -n 1 -f /dev/null & PID=$! && sleep 10 && kill $PID); then
        echo "Server is ready. Starting tests..."
        break
    fi
    sleep 5
done

# Run the tests
echo "Running tests..."
node "$PROJECT_ROOT/scripts/functional_test_runner" --config "$CONFIG_FILE" --include "$TEST_FILE"

# Wait for user input before exiting (which will trigger cleanup)
echo "Tests completed. Press Enter to exit and stop the server."
read