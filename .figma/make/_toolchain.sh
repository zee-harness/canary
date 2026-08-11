# Shared toolchain setup — sourced by setup/install/dev/verify so every bootstrap
# step runs with the same Node.js on PATH.
#
# This machine has no system Node, pnpm, or Homebrew, so setup/ downloads an
# official Node binary into a persistent cache outside the repo. This file just
# points PATH at that cache; setup/ is what actually installs it.

NODE_VERSION="v20.18.1"        # LTS; satisfies package.json engines (>=18.17.1)
NODE_PLATFORM="darwin"
case "$(uname -m)" in
  arm64) NODE_ARCH="arm64" ;;
  x86_64) NODE_ARCH="x64" ;;
  *) NODE_ARCH="x64" ;;
esac

TOOLCHAIN_ROOT="${FIGMA_MAKE_TOOLCHAIN:-$HOME/.figma-make/toolchain}"
NODE_HOME="$TOOLCHAIN_ROOT/node-$NODE_VERSION-$NODE_PLATFORM-$NODE_ARCH"

export PATH="$NODE_HOME/bin:$PATH"
