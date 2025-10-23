#!/usr/bin/env bash

metode=$1

case "$metode" in
  cloud)
    echo "Run Cloud..."
    #npm install && npm update
    npm run start -- --env prod
    ;;

  update)
    echo "Run Update…"
    npm install && npm update && npm audit fix --force
    ;;

  dev)
    echo "Run Tes Local"
    npm run dev -- --env dev
    ;;

  clean)
    echo "Clean node_modules"
    rm -rf node_modules
    ;;

  *)
    cat <<USAGE
Usage: $0 {cloud [checkupdate]|update|dev|clean}

  cloud         Start in production mode
  cloud checkupdate  First run npm install/update, then start
  update        npm install, npm update, then audit fix
  dev           Start in development mode
  clean         Remove node_modules
USAGE
    exit 1
    ;;
esac
