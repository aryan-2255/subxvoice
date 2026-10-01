#!/bin/sh
# Builds the Swift helper into build/subx-mac-helper.
#   ./build.sh              native architecture (development)
#   ./build.sh --universal  arm64 + x86_64 (release builds)
set -e
cd "$(dirname "$0")"
mkdir -p build

if [ "$1" = "--universal" ]; then
  swiftc -O -target arm64-apple-macos12 Sources/*.swift -o build/subx-mac-helper-arm64
  swiftc -O -target x86_64-apple-macos12 Sources/*.swift -o build/subx-mac-helper-x86_64
  lipo -create -output build/subx-mac-helper build/subx-mac-helper-arm64 build/subx-mac-helper-x86_64
  rm build/subx-mac-helper-arm64 build/subx-mac-helper-x86_64
else
  swiftc -O -target "$(uname -m)-apple-macos12" Sources/*.swift -o build/subx-mac-helper
fi
