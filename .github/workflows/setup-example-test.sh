#!/bin/bash
set -euo pipefail

INSTALL_CMD="${1:-bun install}"

cd packages/superlib && bun install && bun run build && npm pack
cd -

TARBALL=$(ls packages/superlib/*superlib-*.tgz)
cp -r packages/examples /tmp/example-test
cd /tmp/example-test
sed -i 's|"@superlibdotdev/superlib": "workspace:\*"|"@superlibdotdev/superlib": "file:'"$GITHUB_WORKSPACE"'/'"$TARBALL"'"|' package.json
eval "$INSTALL_CMD"
