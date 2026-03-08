#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_MAJOR="${NODE_MAJOR:-22}"
NVM_VERSION="${NVM_VERSION:-v0.39.7}"
FOUNDRY_ARCHIVE_URL="${FOUNDRY_ARCHIVE_URL:-https://github.com/foundry-rs/foundry/releases/download/stable/foundry_stable_linux_amd64.tar.gz}"

log() {
  printf '\n==> %s\n' "$1"
}

warn() {
  printf '\n[warn] %s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

retry_command() {
  local attempts="$1"
  shift

  local count=1
  until "$@"; do
    if [ "${count}" -ge "${attempts}" ]; then
      return 1
    fi

    warn "Command failed. Retrying (${count}/${attempts})..."
    count=$((count + 1))
    sleep 2
  done
}

install_base_packages() {
  if ! command -v apt-get >/dev/null 2>&1; then
    warn "apt-get not found. Skipping OS package installation."
    return
  fi

  log "Installing base OS packages"
  sudo apt-get update
  sudo apt-get install -y \
    build-essential \
    ca-certificates \
    curl \
    git \
    jq \
    pkg-config \
    libssl-dev \
    unzip
}

install_nvm() {
  if [ -s "${HOME}/.nvm/nvm.sh" ]; then
    return
  fi

  log "Installing nvm ${NVM_VERSION}"
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
}

load_nvm() {
  export NVM_DIR="${HOME}/.nvm"
  if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
    echo "nvm was not installed correctly." >&2
    exit 1
  fi

  # shellcheck source=/dev/null
  . "${NVM_DIR}/nvm.sh"
}

install_node() {
  log "Installing Node.js ${NODE_MAJOR}"
  nvm install "${NODE_MAJOR}"
  nvm alias default "${NODE_MAJOR}"
  nvm use "${NODE_MAJOR}"

  npm config set registry https://registry.npmjs.org --location=user
}

install_foundry() {
  if [ ! -x "${HOME}/.foundry/bin/foundryup" ]; then
    log "Installing Foundry bootstrapper"
    curl -fsSL https://foundry.paradigm.xyz | bash
  fi

  export PATH="${HOME}/.foundry/bin:${PATH}"

  log "Installing or updating Foundry toolchain"
  if ! retry_command 3 "${HOME}/.foundry/bin/foundryup"; then
    warn "foundryup failed repeatedly. Falling back to direct binary download."
    install_foundry_fallback
  fi

  require_command forge
  require_command cast
}

install_foundry_fallback() {
  local tmp_dir archive
  tmp_dir="$(mktemp -d)"
  archive="${tmp_dir}/foundry.tar.gz"

  mkdir -p "${HOME}/.foundry/bin"

  curl --fail --location --http1.1 \
    --retry 5 \
    --retry-delay 2 \
    --retry-all-errors \
    --output "${archive}" \
    "${FOUNDRY_ARCHIVE_URL}"

  tar -xzf "${archive}" -C "${HOME}/.foundry/bin"
  chmod +x \
    "${HOME}/.foundry/bin/forge" \
    "${HOME}/.foundry/bin/cast" \
    "${HOME}/.foundry/bin/anvil" \
    "${HOME}/.foundry/bin/chisel"

  rm -rf "${tmp_dir}"
}

install_project_deps() {
  log "Installing project npm dependencies"
  cd "${PROJECT_ROOT}"
  npm install
}

print_summary() {
  cd "${PROJECT_ROOT}"

  log "Environment ready"
  printf 'Project root: %s\n' "${PROJECT_ROOT}"
  printf 'Node version: %s\n' "$(node --version)"
  printf 'npm version: %s\n' "$(npm --version)"
  printf 'forge version: %s\n' "$(forge --version)"
  printf 'cast version: %s\n' "$(cast --version)"

  cat <<'EOF'

Next commands:
  npm run demo:payload:1
  forge build
  forge test

If `node` is not available in a new shell, run:
  export NVM_DIR="$HOME/.nvm"
  . "$NVM_DIR/nvm.sh"
  nvm use 22
EOF
}

main() {
  require_command curl
  require_command git

  install_base_packages
  install_nvm
  load_nvm
  install_node
  install_foundry
  install_project_deps
  print_summary
}

main "$@"
