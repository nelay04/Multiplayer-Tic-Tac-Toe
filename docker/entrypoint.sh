#!/bin/sh
set -e

required_vars="MONGODB_URI PORT NODE_ENV"

for var in $required_vars; do
  eval value=\$$var
  if [ -z "$value" ]; then
    echo "Error: required environment variable '$var' is not set. Check your .env file." >&2
    exit 1
  fi
done

exec "$@"
