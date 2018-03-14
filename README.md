# Corpus Christi Frontend

## Install

This project requires Node 6.x or greater.

```bash
$ git clone git@github.com:springbox/corpus-christi-frontend
$ yarn
```

If you do not have [Yarn](https://yarnpkg.com), run:

```bash
$ npm install -g yarn forever
```

# Build

```bash
$ yarn install
$ yarn run build
```

# Run

```bash
$ CC_PORT=8080 yarn start
$ # Fish:
$ env CC_PORT=8080 yarn start
```

To redirect to 80 on production:
```
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
```

# Watch

```bash
$ CC_PORT=8080 yarn run watch
```

# Debug

Just Corpus Christi logging:

```bash
$ DEBUG='cc*' CC_PORT=8080 yarn start # or run watch
```

Everything:

```bash
$ DEBUG='*' CC_PORT=8080 yarn start # or run watch
```
