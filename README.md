# spinal-organ-nomenclature

There are 2 scripts.

- get.js -- used to get data from the spinalhub
- push.js -- used to push data to the spinlahub using either a xlsx or json

## Install

Use spinalcom-utils

```sh
spinalcom-utils i
```

## connection setup

copy the .env to .env.local and fill it

## Get

Setup the configuration javascript file `get_config.js`.
There are 2 modes to visit the graph either via `CONTEXT` or `RELATION`, pick one.

```sh
node get.js
```

## Push

The setup are in the .env(.local)

```sh
node push.js JSON_OR_XLSX_FILE_PATH
```

## How push work

- read the xlxs (if xlxs)
- convert it to json
- for each row
  - load the Spinalnode using the `Dynamic ID` attr
  - parse the header of the row
  - if there is NOT a `/` separation it's designated as an attribute inside the `info` of the node.
  - else as a spinalcom documentation attribute
    - get the attributs from the SpinalNode corresponding for the sheet
    - set / create the attributs from the sheet to the SpinalNode

There are some exceptions for the "empty" values in the sheet e.g : ` ` (space), `-` or `null`

- if the attribut exist in the node but "empty" in the sheet, it will be set to `-`
- else if it doesn't exist in the node, they are skipped
